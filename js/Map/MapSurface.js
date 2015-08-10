const React = require('react/addons');
const stylesheet = require('../../less/map.less');

const MapSurface = React.createClass({

  propTypes: {
    onMount: React.PropTypes.func.isRequired
  },

  componentDidMount() {
    this.props.onMount(this.getDOMNode());
  },

  render() {
    return (
      <div className={stylesheet.mapContainer}></div>
    );
  }  
});


module.exports = MapSurface;