const React = require('react/addons');
const stylesheet = require('../../less/map.less');
const MapSurface = require('./MapSurface');
const MapEngine = require('./MapEngine');

const MapComponent = React.createClass({

  propTypes: {
    startAddr: React.PropTypes.string.isRequired,
    startZoom: React.PropTypes.number.isRequired
  },

  getInitialState() {
    return {
      start: this.props.startAddr,
      finish: "",
      routes: []
    }
  },

  componentWillMount() {
    this.mapEngine = new MapEngine();
  },

  startChanged(ev) {
    this.setState({start: ev.target.value});
  },

  finishChanged(ev) {
    this.setState({finish: ev.target.value});
  },

  calcRoute() {
    const { start, finish } = this.state;
    this.mapEngine.calcRoute(start, finish, 20, results =>
      this.setState({routes: results})
    );
  },

  drawMap(DOMNode) {
    const { startAddr, startZoom } = this.props;
    this.mapEngine.drawMap(DOMNode, startAddr, startZoom);
  },

  keyPress(ev) {
    if (ev.key === "Enter") {
      this.calcRoute();
    }
  },

  renderRouteLink(route) {
    return (
      <div className={stylesheet.routeLink}>
        <a onClick={route.displayFn}>{route.title}</a>
      </div>
    );
  },

  render() {
    const { start, finish, routes } = this.state;
    return (
      <div className={stylesheet.mapContainer}>
        <MapSurface onMount={this.drawMap} />
        <div className={stylesheet.form} onSubmit={this.submit} onKeyPress={this.keyPress}>
          <input type="text" onChange={this.startChanged} value={start} placeholder="start"/>
          <input type="text" onChange={this.finishChanged} placeholder="finish"/>
          <button onClick={this.calcRoute}>Submit</button>
          <div classname={stylesheet.routeLinksContainer}>
            {routes.map(this.renderRouteLink)}
          </div>
        </div>
      </div>
    );
  }  
});


module.exports = MapComponent;