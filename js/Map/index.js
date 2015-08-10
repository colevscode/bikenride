const React = require('react/addons');
const MapComponent = require('./MapComponent');

const MapObject = React.createClass({
  render() {
    return (
      <MapComponent 
        startAddr="348 Baltic St, Brooklyn, NY"
        startZoom={10}

      />
    );
  }  
});


module.exports = MapObject;