Meteor.startup(function() {
	
	// Grab elements, create settings, etc.
	var canvas = $('#canvas')[0],
		context = canvas.getContext('2d'),
		video = $('#video')[0],
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
	} else if(navigator.webkitGetUserMedia) { // WebKit-prefixed
		navigator.webkitGetUserMedia(videoObj, function(stream){
			video.src = window.webkitURL.createObjectURL(stream);
			video.play();
		}, errBack);
	}
	
	Deps.autorun(function() {
		
		var count = Photos.find().count();
		
		// TODO: Intelligently tile the images
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
	$('#snap').click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL()});
	});
});

Template.photoList.photos = function() {
	return Photos.find({});
};

