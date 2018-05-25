// import { Queue, slugid } from 'taskcluster-client-web';
//
// import intermittentTemplate from '../partials/main/intermittent.html';
// import {
//   getBugUrl,
// } from '../helpers/urlHelper';
// import { thEvents } from "../js/constants";


        // const fileBug = function (index) {
        //   const summary = $scope.suggestions[index].search;
        //   const crashRegex = /application crashed \[@ (.+)\]$/g;
        //   const crash = summary.match(crashRegex);
        //   const crashSignatures = crash ? [crash[0].split("application crashed ")[1]] : [];
        //   const allFailures = $scope.suggestions.map(sugg => (sugg.search.split(" | ")));
        //
        //   const modalInstance = $uibModal.open({
        //     template: intermittentTemplate,
        //     controller: 'BugFilerCtrl',
        //     size: 'lg',
        //     openedClass: "filer-open",
        //     resolve: {
        //       summary: () => (summary),
        //       search_terms: () => ($scope.suggestions[index].search_terms),
        //       fullLog: () => ($scope.job_log_urls[0].url),
        //       parsedLog: () => ($scope.lvFullUrl),
        //       reftest: () => ($scope.isReftest() ? $scope.reftestUrl : ""),
        //       selectedJob: () => ($scope.selectedJob),
        //       allFailures: () => (allFailures),
        //       crashSignatures: () => (crashSignatures),
        //       successCallback: () => (data) => {
        //         // Auto-classify this failure now that the bug has been filed
        //         // and we have a bug number
        //         thPinboard.addBug({ id: data.success });
        //         $rootScope.$evalAsync(
        //           $rootScope.$emit(
        //             thEvents.saveClassification));
        //         // Open the newly filed bug in a new tab or window for further editing
        //         window.open(getBugUrl(data.success));
        //       }
        //     }
        //   });
        //   thPinboard.pinJob($scope.selectedJob);
        //
        //   modalInstance.opened.then(function () {
        //     window.setTimeout(() => modalInstance.initiate(), 0);
        //   });
        // };

        // $rootScope.$on(thEvents.autoclassifyVerified, function () {
        //     // These operations are unneeded unless we verified the full job,
        //     // But getting that information to here seems to be non-trivial
        //     $scope.updateBugs();
        //     $timeout($scope.updateClassifications);
        //     ThResultSetStore.fetchJobs([$scope.job.id]);
        //     // Emit an event indicating that a job has been classified, although
        //     // it might in fact not have been
        //     const jobs = {};
        //     jobs[$scope.job.id] = $scope.job;
        //     $rootScope.$emit(thEvents.jobsClassified, { jobs: jobs });
        // });

