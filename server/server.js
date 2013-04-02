Meteor.publish('photos', function(limit) {
	return findPhotos(limit);
});

Meteor.methods({
	photosCount: function() {
		return Photos.find().count();
	}
});