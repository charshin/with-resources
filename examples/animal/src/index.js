import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { StoreContext } from 'with-resources';
import store from './data/store';
import App from './app';
import AppHook from './app.hook';

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <Provider store={store}>{process.env.HOOK ? <AppHook /> : <App />}</Provider>
  </StoreContext.Provider>,
  document.getElementById('root'),
);
