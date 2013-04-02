Meteor.startup(function() {
	
	var canvas = $('#booth canvas')[0],
		context = canvas.getContext('2d'),
		video = $('#booth video')[0];
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia
	window.URL = window.URL || window.mozURL || window.webkitURL;
	
	if(navigator.mozGetUserMedia) {
		console.warn('Set media.navigator.enabled to true in about:config to make mozGetUserMedia work. If it is already working, woo for you.');
	}
	
	navigator.getUserMedia({'video': true}, function(stream) {
		video.src = window.URL.createObjectURL(stream);
		video.play();
	}, function(err) {
		console.error('Video capture error', err); 
	});
	
	// Get the total count of the photos on the server so we can begin retrieving them
	Meteor.call('photosCount', function(err, count) {
		if(err) {
			return console.error('failed to count the photos', err);
		}
		
		// Retrieve photos in 5 item chunks
		var limit = 5;
		var subscriptons = [];
		
		(function bufferedSubscribe() {
			
			subscriptons.push(
				Meteor.subscribe('photos', limit, function() {
					if(limit == 1000000) return;
					
					console.log('Got first ' + limit + ' photos!');
					
					if(limit < count) {
						limit += 5;
					} else {
						limit = 1000000;
					}
					
					bufferedSubscribe();
					
					// Remove the previous subscription
					if(subscriptons.length) {
						subscriptons.shift().stop();
					}
				})
			);
			
		})();
	});
	
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

