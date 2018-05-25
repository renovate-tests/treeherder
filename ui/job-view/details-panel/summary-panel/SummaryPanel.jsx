import React from 'react';
import PropTypes from 'prop-types';

import ActionBar from './ActionBar';
import ClassificationsPanel from './ClassificationsPanel';
import StatusPanel from './StatusPanel';
import {
  getInspectTaskUrl,
  getSlaveHealthUrl,
  getWorkerExplorerUrl,
  getJobSearchStrHref,
} from '../../../helpers/url';
import { toDateStr } from '../../../helpers/display';
import { getSearchStr } from "../../../helpers/job";

export default class SummaryPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      machineUrl: ''
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.selectedJob || !Object.keys(nextProps.selectedJob).length) {
      return;
    }

    this.setJobMachineUrl(nextProps);
  }

  async setJobMachineUrl(props) {
    let machineUrl = null;

    try {
      machineUrl = await this.getJobMachineUrl(props);
    } catch (err) {
      machineUrl = '';
    }

    if (this.state.machineUrl !== machineUrl) {
      this.setState({ machineUrl });
    }
  }

  getJobMachineUrl(props) {
    const { job } = props;
    const { build_system_type, machine_name } = job;
    const machineUrl = (machine_name !== 'unknown' && build_system_type === 'buildbot') ?
      getSlaveHealthUrl(machine_name) :
      getWorkerExplorerUrl(job.taskcluster_metadata.task_id);

    return machineUrl;
  }

  getTimeFields(job) {
    // time fields to show in detail panel, but that should be grouped together
    const timeFields = {
      requestTime: toDateStr(job.submit_timestamp)
    };

    // If start time is 0, then duration should be from requesttime to now
    // If we have starttime and no endtime, then duration should be starttime to now
    // If we have both starttime and endtime, then duration will be between those two
    const endtime = job.end_timestamp || Date.now() / 1000;
    const starttime = job.start_timestamp || job.submit_timestamp;
    const duration = `${Math.round((endtime - starttime)/60, 0)} minute(s)`;

    if (job.start_timestamp) {
        timeFields.startTime = toDateStr(job.start_timestamp);
        timeFields.duration = duration;
    } else {
        timeFields.duration = "Not started (queued for " + duration + ")";
    }

    if (job.end_timestamp) {
        timeFields.endTime = toDateStr(job.end_timestamp);
    }

    return timeFields;
  }

  render() {
    const {
      repoName, selectedJob, latestClassification, bugs, jobLogUrls,
      jobDetailLoading, buildUrl, lvUrl, lvFullUrl, isTryRepo, logParseStatus,
      pinJob,
    } = this.props;

    const timeFields = this.getTimeFields(selectedJob);
    const jobMachineName = selectedJob.machine_name;
    const jobSearchStr = getSearchStr(selectedJob);
    let iconCircleClass = null;

    const buildDirectoryUrl = (selectedJob.build_system_type === 'buildbot' && !!jobLogUrls.length) ?
      jobLogUrls[0].buildUrl : buildUrl;

    if (selectedJob.job_type_description) {
      iconCircleClass = "fa fa-info-circle";
    }

    return (
      <div id="job-details-panel">
        <ActionBar
          repoName={repoName}
          selectedJob={selectedJob}
          logParseStatus={logParseStatus}
          isTryRepo={isTryRepo}
          lvUrl={lvUrl}
          lvFullUrl={lvFullUrl}
          jobLogUrls={jobLogUrls}
          pinJob={pinJob}
        />
        <div>
          <div>
            {jobDetailLoading &&
              <div className="overlay">
                <div>
                  <span className="fa fa-spinner fa-pulse th-spinner-lg" />
                </div>
              </div>
            }

            <ul className="list-unstyled">
              {latestClassification &&
                <ClassificationsPanel
                  job={selectedJob}
                  classification={latestClassification}
                  bugs={bugs}
                  repoName={repoName}
                />}
              <StatusPanel selectedJob={selectedJob} />
              <li className="small">
                <label title="">Job</label>
                <a
                  title="Filter jobs with this unique SHA signature"
                  href={getJobSearchStrHref(selectedJob.signature)}
                >(sig)</a>:&nbsp;
                <a
                  title="Filter jobs containing these keywords"
                  href={getJobSearchStrHref(jobSearchStr)}
                >{jobSearchStr}</a>
              </li>
              {jobMachineName &&
                <li className="small">
                  <label>Machine: </label>
                  <a
                    title="Inspect machine"
                    target="_blank"
                    href={this.state.machineUrl}
                  >{jobMachineName}</a>
                </li>
              }
              {selectedJob.taskcluster_metadata &&
                <li className="small">
                  <label>Task: </label>
                  <a
                    href={getInspectTaskUrl(selectedJob.taskcluster_metadata.task_id)}
                    target="_blank"
                  >{selectedJob.taskcluster_metadata.task_id}</a>
                </li>
              }
              <li className="small">
                <label>Build: </label>
                <a
                  title="Open build directory in a new tab"
                  href={buildUrl}
                  target="_blank"
                >{`${selectedJob.build_architecture} ${selectedJob.build_platform} ${selectedJob.build_os || ''}`}</a>
                <span className={`ml-1${iconCircleClass}`} />
              </li>
              <li className="small">
                <label>Job name: </label>
                <a
                  title="Open build directory in a new tab"
                  href={buildDirectoryUrl}
                  target="_blank"
                >{selectedJob.job_type_name}</a>
                <span className={`ml-1${iconCircleClass}`} />
              </li>
              {timeFields && <span>
                <li className="small">
                  <label>Requested: </label>{timeFields.requestTime}
                </li>
                {timeFields.startTime && <li className="small">
                  <label>Started: </label>{timeFields.startTime}
                </li>}
                {timeFields.endTime && <li className="small">
                  <label>Ended: </label>{timeFields.endTime}
                </li>}
                <li className="small">
                  <label>Duration: </label>{timeFields.duration}
                </li>
              </span>}
              {!jobLogUrls.length ?
                <li className="small"><label>Log parsing status: </label>No logs</li> :
                jobLogUrls.map(data => (
                  <li className="small" key={data}>
                    <label>Log parsing status: </label>{data.parse_status}
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

SummaryPanel.propTypes = {
  repoName: PropTypes.string.isRequired,
  pinJob: PropTypes.func.isRequired,
  selectedJob: PropTypes.object,
  latestClassification: PropTypes.object,
  bugs: PropTypes.array,
  jobLogUrls: PropTypes.array,
  jobDetailLoading: PropTypes.bool,
  buildUrl: PropTypes.string,
  logParseStatus: PropTypes.string,
  isTryRepo: PropTypes.bool,
  lvUrl: PropTypes.string,
  lvFullUrl: PropTypes.string,
};

SummaryPanel.defaultProps = {
  selectedJob: null,
  latestClassification: null,
  bugs: [],
  jobLogUrls: [],
  jobDetailLoading: false,
  buildUrl: null,
  logParseStatus: 'pending',
  isTryRepo: true,
  lvUrl: null,
  lvFullUrl: null,
};
