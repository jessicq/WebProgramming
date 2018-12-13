import React from 'react';
import {
	Admin,
	Resource,
	fetchUtils,
} from 'react-admin';


import jsonServerProvider from 'ra-data-json-server';
import AuthProvider from './AuthProvider';

//Need to make const stuff in original students.js in order to properly use resource name
import {
        ListStudents,
        ShowStudents,
        EditStudents,
        CreateStudents,
} from './Students';

//Need to make const stuff in original grades.js in order to properly use resource name
import {
        ListGrades,
        ShowGrades,
        EditGrades,
        CreateGrades,
} from './Grades';

//import logo from './logo.svg';
//import './App.css';

/*class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
} */

let host = window.location.host; //port 3001 is part of the host name, so you'll get out something like 52.123.6.4:3001
host = host.split(':')[0] + ':3000';
let url = 'http://' + host;

const httpClient = (url, options = {}) => {
        if(!options.headers) {
                        options.headers = new Headers({ Accept: 'application/json' });
        }

        const authString = localStorage.getItem('authString');
        options.headers.set('Authorization', 'Basic ' + authString);
        return fetchUtils.fetchJson(url, options);
};

const App = () => (
                <Admin authProvider={AuthProvider} dataProvider = {jsonServerProvider(url, httpClient)}> 
                        <Resource name="Students" list={ListStudents} show={ShowStudents} edit={EditStudents} create={CreateStudents} />
                        <Resource name="Grades" list={ListGrades} show={ShowGrades} edit={EditGrades} create={CreateGrades} />
                </Admin>
);

export default App;
