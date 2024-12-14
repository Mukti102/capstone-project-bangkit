
const {postPredictHandler,getPlaceDetails} = require('./handler');
const routes = [
  {
    path: '/predict',
    method: 'POST',
    handler: postPredictHandler,
    options: {
      payload: {
        // data json
        output: 'data',
        parse: true,
      }
    }
  },
  {
    path: '/place/{placeId}',
    method: 'GET',
    handler: getPlaceDetails
  }
]
 
module.exports = routes;