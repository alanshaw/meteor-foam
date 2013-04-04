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

	// Do some d3 when the Photos collection changes.
	Deps.autorun(function(){
		renderPhotos();
	});

	// Trigger photo take
	$('#booth button').click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL(), created: new Date().getTime()});
	});
});

function renderPhotos() {
	
	var photos = Photos.find().fetch();
	
	if(!photos.length) return;
	
	var width = document.documentElement.clientWidth;
	var height = document.documentElement.clientHeight;
	
	var svg = d3.select('#photos svg')
		.attr('width', width)
		.attr('height', height);
	
	var layout = d3.layout.pack().sort(d3.descending).size([width, height]);
	
	var data = photos.map(function(photo) {
		return {_id: photo._id, url: photo.url, value: photo.created};
	});
	
	var photo = svg.selectAll('.photo').data(layout.nodes({children: data}).filter(function(d) {return !d.children;}));
	
	var photoEnter = photo.enter()
		.append('g')
		.attr('class', 'photo')
		.attr('transform', function(d) { return 'translate(' + width / 2 + ', ' + height / 2 + ')'; })
	
	photoEnter.append('image')
		.attr('xlink:href', function(d) { return d.url; })
		.attr('preserveAspectRatio', 'none');
	
	var photoUpdate = photo.transition()
		.attr('transform', function(d) { return 'translate(' + d.x + ', ' + d.y + ')'; });
	
	photoUpdate.select('image')
		.attr('width', function(d) { return d.r * 2; })
		.attr('height', function(d) { return d.r * 2; });
}
