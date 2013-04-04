Meteor.publish('photos', function(limit) {
	return Photos.find({}, {limit: limit});
});

Meteor.methods({
	photosCount: function() {
		return Photos.find().count();
	}
});

Meteor.setInterval(function() {
	var count = Photos.find().count();
	var deleteCount = count - 200;
	
	if(deleteCount <= 0) return;
	
	console.log('About to purge ' + deleteCount + ' photos');
	
	var photoIds = Photos.find({}, {limit: deleteCount, sort: [['created', 'asc']]}).map(function(photo) {
		return photo._id;
	});
	
	Photos.remove({_id: {$in: photoIds}}, function() {
		console.log(deleteCount + ' photos purged');
	});
	
}, 60000 * 5);