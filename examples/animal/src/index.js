import ReactDOM from 'react-dom';
import store from './data/store';
import App from './app';

ReactDOM.render(<App store={store} />, document.getElementById('root'));
