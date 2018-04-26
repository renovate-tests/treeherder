export const types = {
  PIN_JOB: 'PIN_JOB',
  UNPIN_JOB: 'UNPIN_JOB',
  CLEAR_PINNED_JOBS: 'CLEAR_PINNED_JOBS',
  RENDER_JOBS: 'RENDER_JOBS',
  ADD_BUG: 'ADD_BUG',
  REMOVE_BUG: 'REMOVE_BUG',
  CLEAR_ALL: 'CLEAR_ALL'
};
export const actions = {
  pinJob: job => ({
    type: types.PIN_JOB,
    meta: { job },
  }),
  unPinJob: job => ({
    type: types.UNPIN_JOB,
    meta: { job },
  }),
  addBug: (job, bugId) => ({
    type: types.ADD_BUG,
    meta: { job, bugId },
  }),
  removeBug: (job, bugId) => ({
    type: types.REMOVE_BUG,
    meta: { job, bugId },
  }),
  clearPinnedJobs: () => ({
    type: types.CLEAR_PINNED_JOBS,
    meta: {},
  }),
  clearAll: () => ({
    type: types.CLEAR_ALL,
    meta: {},
  }),
};
const initialState = {
  jobs: [],
  bugs: [],
};
export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case types.PIN_JOB:
      if (!state.jobs.includes(action.meta.job)) {
        return { ...state, jobs: [...state.jobs, action.meta.job] };
      }

      return state;
    case types.RENDER_JOBS:
      return {
        ...state,
        ...action.payload,
      };
    case types.RENDER_BUGS:
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};
