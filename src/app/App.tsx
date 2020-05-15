import React, { Component } from 'react'
import { hot } from 'react-hot-loader/root'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { Alex } from './Alex'
import { NotFound } from './NotFound'

import './styles/styles.scss'

class App extends Component {
	render() {
		return (
			<Router>
				<Switch>
					<Route path="/" exact component={Alex} />
					<Route path="/:t" exact component={({ match }) => <Alex time={match.params.t} />} />
					<Route component={NotFound} />
				</Switch>
			</Router>
		)
	}
}

// eslint-disable-next-line import/no-default-export
export default process.env.NODE_ENV === 'development' ? hot(App) : App
