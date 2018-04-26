import {
  // applyMiddleware,
  bindActionCreators,
  combineReducers,
  createStore
} from 'redux';
import * as pinBoardStore from './modules/pinBoard';

//
// Using context for the PinBoard would have required some top-level container
// object, and it just seems like this is what redux is made for.  it can then
// share it with the PushHeader, details ActionBar, and the PinBoard itself
//
// I may change my mind on Monda, but I think this is good.
//
// Redux may also be the right place for the filtering and for the PushStore
// that will replace the resultsets_store.
//
// I like that this will keep the code for managing the state of each of those
// items in one place and contained, rather than som arbitrary high-level
// component's state
//
// .
// function pinJob(store, params) {
//   const { jobs, job } = params;
//
//   store.dispatch({
//     type: pinBoardStore.types.RENDER_JOBS,
//     payload: { jobs: [...jobs, job] },
//   });
// }

// TODO: these functions seem kind of useless, since they're just
// setting values and not fetching.  Is there a more streamlined way to do this?
// function addBug(store, params) {
//   const { job, bug } = params;
//
//
//
//   store.dispatch({
//     type: pinBoardStore.types.RENDER_BUGS,
//     payload,
//   });
//
// }

// const testDataMiddleware = store => next => (action) => {
//   if (!action.meta) {
//     return next(action);
//   }
//
//   const consumed = { ...action };
//   delete consumed.meta;
//
//   switch (action.type) {
//     case pinBoardStore.types.PIN_JOB:
//       pinJob(store, { ...action.meta });
//       return next(consumed);
//     // case pinBoardStore.types.ADD_BUG:
//     //   addBug(store, { ...action.meta });
//     //   return next(consumed);
//     default:
//       break;
//   }
//
//   return next(action);
// };

export default () => {
  const reducer = combineReducers({
    pinBoard: pinBoardStore.reducer,
  });
  // const store = createStore(reducer, applyMiddleware(testDataMiddleware));
  const store = createStore(reducer);
  const actions = {
    pinBoard: bindActionCreators(pinBoardStore.actions, store.dispatch),
  };

  return { store, actions };
};
