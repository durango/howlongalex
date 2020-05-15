import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

/* needs to be referenced, but really ends up being inlined in index.html */
import './styles/initial.scss'

ReactDOM.render(<App />, document.querySelector('body > main'))
