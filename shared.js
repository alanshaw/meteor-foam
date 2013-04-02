var Photos = new Meteor.Collection('photos');

function findPhotos(limit) {
	return Photos.find({}, {limit: limit});
}