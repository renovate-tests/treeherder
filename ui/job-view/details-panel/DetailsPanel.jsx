import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from "react2angular/index.es2015";
import { chunk, flatten } from 'lodash';
import { $rootScope } from 'ngimport/index.es2015';
import $ from 'jquery';

import { InjectorContext } from '../../context/InjectorContext';
import TabsPanel from './tabs-panel/TabsPanel';
import treeherder from "../../js/treeherder";
import { getLogViewerUrl, getReftestUrl } from "../../helpers/url";
import SummaryPanel from './summary-panel/SummaryPanel';
import PinBoard from './pinboard/PinBoard';
import JobClassificationModel from '../../models/classification';
import JobDetailModel from '../../models/jobDetail';
import {
  thEvents,
  thBugSuggestionLimit,
  thPinboardCountError,
  thPinboardMaxSize,
} from '../../js/constants';
import JobModel from '../../models/job';
import TextLogStepModel from '../../models/textLogStep';
import BugSuggestionsModel from '../../models/bugSuggestions';
import JobLogUrlModel from '../../models/jobLogUrl';
import BugJobMapModel from "../../models/bugJobMap";

class DetailsPanel extends React.Component {
  constructor(props) {
    super(props);

    const { $injector } = this.props;

    this.PhSeries = $injector.get("PhSeries");
    this.ThResultSetStore = $injector.get("ThResultSetStore");
    this.thClassificationTypes = $injector.get("thClassificationTypes");
    this.thNotify = $injector.get("thNotify");

    // used to cancel all the ajax requests triggered by selectJob
    this.selectJobCanceler = null;

    this.state = {
      isPinBoardVisible: false,
      jobDetails: [],
      jobLogUrls: [],
      jobDetailLoading: false,
      jobLogsAllParsed: false,
      lvUrl: null,
      lvFullUrl: null,
      reftestUrl: null,
      perfJobDetail: [],
      jobRevision: null,
      logParseStatus: 'unavailable',
      classifications: [],
      bugs: [],
      suggestions: [],
      errors: [],
      bugSuggestionsLoading: false,
      pinnedJobs: {},
      pinnedJobBugs: {},
    };
  }

  componentDidMount() {
    this.pinJob = this.pinJob.bind(this);
    this.unPinJob = this.unPinJob.bind(this);
    this.unPinAll = this.unPinAll.bind(this);
    this.addBug = this.addBug.bind(this);
    this.removeBug = this.removeBug.bind(this);

    $rootScope.$on(thEvents.jobClick, (evt, job) => {
      // console.log("jobClick", a, b);
      this.selectJob(job);
    });

    $rootScope.$on(thEvents.clearSelectedJob, () => {
      const { pinnedJobs } = this.state;

      if (this.selectJobCanceler !== null) {
        this.selectJobCanceler.abort();
      }
      if (!Object.keys(pinnedJobs).length) {
        this.closeJob();
      }
    });

    $rootScope.$on(thEvents.toggleJobPin, (event, job) => {
      this.toggleJobPin(job);
    });

    $rootScope.$on(thEvents.jobPin, (event, job) => {
      this.pinJob(job);
    });

    $rootScope.$on(thEvents.saveClassification, () => {
      if (this.isPinboardVisible) {
        this.updateClassifications(this.props.selectedJob);
      }
    });

    $rootScope.$on(thEvents.clearPinboard, () => {
      if (this.isPinboardVisible) {
        this.unPinAll();
      }
    });

    // Triggered on pin api events eg. from the job details navbar
    $rootScope.$on(thEvents.pulsePinCount, () => {
      this.pulsePinCount();
    });

  }

  getRevisionTips() {
    return this.ThResultSetStore.getPushArray().map(push => ({
      revision: push.revision,
      author: push.author,
      title: push.revisions[0].comments.split('\n')[0]
    }));
  }

  togglePinBoardVisibility() {
      this.setState({ isPinBoardVisible: !this.state.isPinBoardVisible });
  }

  loadBugSuggestions(job) {
      const { repoName } = this.props;

      BugSuggestionsModel.get(job.id).then((suggestions) => {
          suggestions.forEach((suggestion) => {
              suggestion.bugs.too_many_open_recent = (
                  suggestion.bugs.open_recent.length > thBugSuggestionLimit
              );
              suggestion.bugs.too_many_all_others = (
                  suggestion.bugs.all_others.length > thBugSuggestionLimit
              );
              suggestion.valid_open_recent = (
                  suggestion.bugs.open_recent.length > 0 &&
                      !suggestion.bugs.too_many_open_recent
              );
              suggestion.valid_all_others = (
                  suggestion.bugs.all_others.length > 0 &&
                      !suggestion.bugs.too_many_all_others &&
                      // If we have too many open_recent bugs, we're unlikely to have
                      // relevant all_others bugs, so don't show them either.
                      !suggestion.bugs.too_many_open_recent
              );
          });

          // if we have no bug suggestions, populate with the raw errors from
          // the log (we can do this asynchronously, it should normally be
          // fast)
          if (!suggestions.length) {
              TextLogStepModel.get(job.id).then((textLogSteps) => {
                  const errors = textLogSteps
                      .filter(step => step.result !== 'success')
                      .map(step => ({
                        name: step.name,
                        result: step.result,
                        lvURL: getLogViewerUrl(job.id, repoName, step.finished_line_number)
                      }));
                  this.setState({ errors });
              });
          }

          this.setState({ bugSuggestionsLoading: false, suggestions });
      });
  }

  async updateClassifications(job) {
    const classifications = await JobClassificationModel.getList({ job_id: job.id });
    const bugs = await BugJobMapModel.getList({ job_id: job.id });
    this.setState({ classifications, bugs });
  }

  selectJob(newJob) {
    const { repoName } = this.props;
    this.setState({ jobDetailLoading: true });

    if (this.selectJobCanceler !== null) {
      // Cancel the in-progress fetch requests.
      this.selectJobCanceler.abort();
    }
    this.selectJobCanceler = new window.AbortController();

    let jobDetails = [];
    const jobPromise = JobModel.get(
      repoName, newJob.id,
      this.selectJobCanceler.signal);

    const jobDetailPromise = JobDetailModel.getJobDetails(
      { job_guid: newJob.job_guid },
      this.selectJobCanceler.signal);

    const jobLogUrlPromise = JobLogUrlModel.getList(
      { job_id: newJob.id },
      this.selectJobCanceler.signal);

    const phSeriesPromise = this.PhSeries.getSeriesData(
      repoName, { job_id: newJob.id });

    Promise.all([
      jobPromise,
      jobDetailPromise,
      jobLogUrlPromise,
      phSeriesPromise
    ]).then(async (results) => {

      //the first result comes from the job promise
      const job = results[0];
      const jobRevision = this.ThResultSetStore.getPush(job.result_set_id).revision;

      // the second result comes from the job detail promise
      jobDetails = results[1];

      // incorporate the buildername into the job details if this is a buildbot job
      // (i.e. it has a buildbot request id)
      const buildbotRequestIdDetail = jobDetails.find(detail => detail.title === 'buildbot_request_id');
      if (buildbotRequestIdDetail) {
        jobDetails = [...jobDetails, { title: "Buildername", value: job.ref_data_name }];
      }

      // the third result comes from the jobLogUrl promise
      // exclude the json log URLs
      const jobLogUrls = results[2].filter(log => !log.name.endsWith("_json"));

      let logParseStatus = 'unavailable';
      // Provide a parse status as a scope variable for logviewer shortcut
      if (jobLogUrls.length && jobLogUrls[0].parse_status) {
        logParseStatus = jobLogUrls[0].parse_status;
      }

      // Provide a parse status for the model
      const jobLogsAllParsed = (jobLogUrls ?
        jobLogUrls.every(jlu => jlu.parse_status !== 'pending') :
        false);

      const lvUrl = getLogViewerUrl(job.id, repoName);
      const lvFullUrl = location.origin + "/" + lvUrl;
      const reftestUrl = jobLogUrls.length ?
        `${getReftestUrl(jobLogUrls[0].url)}&only_show_unexpected=1` :
        '';
      const performanceData = flatten(Object.values(results[3]));

      let perfJobDetail = [];
      if (performanceData) {
        const signatureIds = [...new Set(performanceData.map(perf => perf.signature_id))];
        const seriesListList = await Promise.all(chunk(signatureIds, 20).map(
          signatureIdChunk => this.PhSeries.getSeriesList(repoName, { id: signatureIdChunk })
        ));
        const seriesList = flatten(seriesListList);

        perfJobDetail = performanceData.map(d => ({
          series: seriesList.find(s => d.signature_id === s.id),
          ...d
        })).filter(d => !d.series.parentSignature).map(d => ({
          url: `/perf.html#/graphs?series=${[repoName, d.signature_id, 1, d.series.frameworkId]}&selected=${[repoName, d.signature_id, job.result_set_id, d.id]}`,
          value: d.value,
          title: d.series.name
        }));
      }

      // set the tab options and selections based on the selected job
      // initializeTabs($scope.job, (Object.keys(performanceData).length > 0));
      this.setState({
        jobDetailLoading: false,
        jobLogUrls,
        jobDetails,
        jobLogsAllParsed,
        logParseStatus,
        lvUrl,
        lvFullUrl,
        reftestUrl,
        perfJobDetail,
        jobRevision,
      }, async () => {
        await this.updateClassifications(job);
        this.loadBugSuggestions(job);
      });
      this.selectJobCanceler = null;
    });
  }

  closeJob() {
    $rootScope.selectedJob = null;
    this.ThResultSetStore.setSelectedJob();
    this.$location.search("selectedJob", null);
    if (this.selectJobCanceler) {
      this.selectJobCanceler.abort();
    }

    this.setState({ isPinboardVisible: false });
  }

  toggleJobPin(job) {
    const { pinnedJobs } = this.state;

    if (pinnedJobs.includes(job)) {
      this.unPinJob(job);
    } else {
      this.pinJob(job);
    }
    if (!this.selectedJob) {
      this.selectJob(job);
    }
  }

  pulsePinCount() {
    $(".pin-count-group").addClass("pin-count-pulse");
    window.setTimeout(() => {
      $(".pin-count-group").removeClass("pin-count-pulse");
    }, 700);
  }

  pinJob(job) {
    const { pinnedJobs } = this.state;

    if (thPinboardMaxSize - Object.keys(pinnedJobs).length > 0) {
      this.setState({
        pinnedJobs: { ...pinnedJobs, [job.id]: job },
        isPinBoardVisible: true,
      });
      this.pulsePinCount();
    } else {
      this.thNotify.send(thPinboardCountError, 'danger');
    }
    if (!this.state.selectedJob) {
      this.selectJob(job);
    }
  }

  unPinJob(id) {
    const { pinnedJobs } = this.state;

    delete pinnedJobs[id];
    this.setState({ pinnedJobs: { ...pinnedJobs } });
  }

  pinJobs(jobsToPin) {
    jobsToPin.forEach(this.pinJob);
  }

  pinAllShownJobs() {
    if (!this.spaceRemaining()) {
      this.thNotify.send(thPinboardCountError, 'danger', { sticky: true });
      return;
    }
    const shownJobs = this.ThResultSetStore.getAllShownJobs(
      this.spaceRemaining(),
      thPinboardCountError
    );
    this.pinJobs(shownJobs);

    if (!$rootScope.selectedJob) {
      $rootScope.selectedJob = shownJobs[0];
    }
  }

  addBug(bug, job) {
    const { pinnedJobBugs } = this.state;

    pinnedJobBugs[bug.id] = bug;
    this.setState({ pinnedJobBugs: { ...pinnedJobBugs } });
    if (job) {
        this.pinJob(job);
    }
  }

  removeBug(id) {
    const { pinnedJobBugs } = this.state;

    delete pinnedJobBugs[id];
    this.setState({ pinnedJobBugs: { ...pinnedJobBugs } });
  }

  unPinAll() {
    this.setState({
      pinnedJobs: {},
      pinnedJobBugs: {},
    });
  }

  render() {
    const {
      selectedJob, repoName, $injector, user, currentRepo
    } = this.props;
    const {
      isPinBoardVisible, jobDetails, jobRevision, jobLogUrls, jobDetailLoading,
      perfJobDetail, suggestions, errors, bugSuggestionsLoading, logParseStatus,
      classifications, lvUrl, lvFullUrl, pinnedJobs, pinnedJobBugs, bugs,
    } = this.state;

    return (
      <div
        className={selectedJob ? 'info-panel-slide' : 'hidden'}
      >
        <InjectorContext.Provider value={$injector}>
          <div
            id="info-panel-resizer"
            resizer="horizontal"
            resizer-height="6"
            resizer-bottom="#info-panel"
          />
          {isPinBoardVisible && <PinBoard
            id="pinboard-panel"
            isVisible={isPinBoardVisible}
            isLoggedIn={user.isLoggedIn || false}
            classificationTypes={this.thClassificationTypes}
            revisionList={this.getRevisionTips()}
            pinnedJobs={pinnedJobs}
            pinnedJobBugs={pinnedJobBugs}
            addBug={this.addBug}
            removeBug={this.removeBug}
            pinJob={this.pinJob}
            unPinJob={this.unPinJob}
            unPinAll={this.unPinAll}
          />}
          {!!selectedJob && <div id="info-panel-content">
            <SummaryPanel
              repoName={repoName}
              selectedJob={selectedJob}
              jobLogUrls={jobLogUrls}
              logParseStatus={logParseStatus}
              jobDetailLoading={jobDetailLoading}
              latestClassification={classifications.length ? classifications[0] : null}
              isTryRepo={currentRepo.isTryRepo}
              lvUrl={lvUrl}
              lvFullUrl={lvFullUrl}
              pinJob={this.pinJob}
            />
            <TabsPanel
              jobDetails={jobDetails}
              perfJobDetail={perfJobDetail}
              selectedJob={selectedJob}
              repoName={repoName}
              jobRevision={jobRevision}
              suggestions={suggestions}
              errors={errors}
              bugSuggestionsLoading={bugSuggestionsLoading}
              logParseStatus={logParseStatus}
              classifications={classifications}
              classificationTypes={this.thClassificationTypes}
              jobLogUrls={jobLogUrls}
              isPinBoardVisible={isPinBoardVisible}
              pinnedJobs={pinnedJobs}
              bugs={bugs}
              addBug={this.addBug}
              togglePinBoardVisibility={() => this.togglePinBoardVisibility()}
            />
          </div>}
          <div id="clipboard-container"><textarea id="clipboard" />
          </div>
        </InjectorContext.Provider>
      </div>
    );
  }
}

DetailsPanel.propTypes = {
  $injector: PropTypes.object.isRequired,
  repoName: PropTypes.string.isRequired,
  selectedJob: PropTypes.object,
  user: PropTypes.object,
  currentRepo: PropTypes.object,
};

DetailsPanel.defaultProps = {
  selectedJob: null,
  user: { isLoggedIn: false, isStaff: false, email: null },
  currentRepo: { isTryRepo: true },
};

treeherder.component('detailsPanel', react2angular(
  DetailsPanel,
  ['repoName', 'selectedJob', 'user'],
  ['$injector']));
