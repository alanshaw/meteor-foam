Meteor.startup(function() {
	
	// Grab elements, create settings, etc.
	var canvas = $('#booth canvas')[0],
		context = canvas.getContext('2d'),
		video = $('#booth video')[0],
		videoObj = {'video': true},
		errBack = function(error) {
			console.error('Video capture error', error.code); 
		};
	
	// Put video listeners into place
	if(navigator.getUserMedia) { // Standard
		navigator.getUserMedia(videoObj, function(stream) {
			video.src = stream;
			video.play();
		}, errBack);
	} else if(navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia(videoObj, function(stream){
			video.src = window.webkitURL.createObjectURL(stream);
			video.play();
		}, errBack);
	} else if(navigator.mozGetUserMedia) {
		console.warn('Set media.navigator.enabled to true in about:config to make mozGetUserMedia work. If it is already working, woo for you.');
		navigator.mozGetUserMedia(videoObj, function(stream){
			video.src = window.URL.createObjectURL(stream);
			video.play();
		}, errBack);
	}
	
	// Get the total count of the photos on the server so we can begin retrieving them
	Meteor.call('photosCount', function(err, count) {
		if(err) {
			return console.error('failed to count the photos', err);
		}
		
		// Retrieve photos in 25 item chunks
		var limit = 25;
		
		(function bufferedSubscribe() {
			
			Meteor.subscribe('photos', limit, function() {
				if(limit == 1000000) return;
				
				console.log('Got first ' + limit + ' photos!');
				
				if(limit < count) {
					limit += 25;
				} else {
					limit = 1000000;
				}
				
				bufferedSubscribe();
			});
			
		})();
	});
	
	/*Deps.autorun(function() {
		
		var count = Photos.find().count();
		
		// TODO: Intelligently tile the images
	});*/
	
	// TODO: Temporary hack
	setInterval(function() {
		var winWidth = $(window).width();
		var winHeight = $(window).height();
		
		if($('#photos').height() > winHeight) {
			var images = $('#photos img');
			images.width(images.width() - 1);
		}
		
	}, 50);
	
	// Trigger photo take
	$('#booth button').click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL()});
	});
});

Template.photoList.photos = function() {
	return Photos.find();
};

