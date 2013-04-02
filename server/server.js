Meteor.publish('photos', function(limit) {
	return Photos.find({}, {limit: limit});
});

Meteor.methods({
	photosCount: function() {
		return Photos.find().count();
	}
});