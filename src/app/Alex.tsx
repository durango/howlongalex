import React, { Component } from 'react'

interface Props {
	time?: string
}
interface State {
	time: number
}

export class Alex extends Component<Props, State> {
	constructor(p: Props) {
		super(p)
		this.state = { time: parseFloat(p.time ?? '0') }
	}

	get hasTime() {
		return this.state.time > 0 && !isNaN(this.state.time)
	}

	get actualTime() {
		return (this.state.time * 2.718).toFixed(1)
	}

	render() {
		return (
			<article>
				<div>
					<em>Alex</em> says
					<input
						type="number"
						onChange={e => this.setState({ time: parseFloat(e.target.value) })}
						value={this.state.time}
						step="0.5"
						min="0"
						max="10"
					/>{' '}
					hours
				</div>
				{this.hasTime ? <div>Alex time converted to real world time is {this.actualTime} hours</div> : null}
			</article>
		)
	}
}
