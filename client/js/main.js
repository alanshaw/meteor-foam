Meteor.startup(function() {
	
	var booth = $('#booth'),
		canvas = $('canvas', booth)[0],
		context = canvas.getContext('2d'),
		video = $('video', booth)[0],
		button = $('button', booth);
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia
	window.URL = window.URL || window.mozURL || window.webkitURL;
	
	if(navigator.mozGetUserMedia) {
		console.warn('Set media.navigator.enabled to true in about:config to make mozGetUserMedia work. If it is already working, woo for you.');
	}
	
	// Only show the booth when the user has accepted the consequences
	booth.hide();
	
	navigator.getUserMedia({'video': true}, function(stream) {
		video.src = window.URL.createObjectURL(stream);
		video.play();
		booth.show();
	}, function(err) {
		console.error('Video capture error', err); 
	});
	
	// Get the total count of the photos on the server so we can begin retrieving them
	Meteor.call('photosCount', function(err, count) {
		if(err) {
			return console.error('failed to count the photos', err);
		}
		
		console.log(count, 'photos available');
		
		// Retrieve photos in chunks
		var limit = 1;
		var increment = 5;
		var subscriptons = [];
		
		(function bufferedSubscribe() {
			
			subscriptons.push(
				Meteor.subscribe('photos', limit, function() {
					if(limit == 1000000) return;
					
					console.log('Got first ' + limit + ' photos!');
					
					if(limit < count) {
						limit += increment;
						increment = increment >= 15 ? 15 : increment + 5;
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
	button.click(function() {
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
		// Provide default created value for legacy photos, also divide by 1000000 because of https://github.com/mbostock/d3/issues/1075
		return {_id: photo._id, url: photo.url, value: (photo.created || 1365080502355) / 1000000};
	});
	
	var photo = svg.selectAll('.photo')
		.data(layout.nodes({children: data}).filter(function(d) {return !d.children;}), function(d) {return d._id;});
	
	var photoEnter = photo.enter()
		.append('g')
		.attr('class', 'photo')
		.attr('transform', 'translate(' + (width / 2) + ', ' + (height / 2) + ')')
	
	photoEnter.append('clipPath')
		.attr('id', function(d) { return 'cp-' + d._id; })
		.append('circle');
	
	photoEnter.append('image')
		.attr('xlink:href', function(d) { return d.url; })
		.attr('preserveAspectRatio', 'none')
		.attr('clip-path', function(d) { return 'url(#cp-' + d._id + ')'; });
	
	var photoUpdate = photo.transition()
		.attr('transform', function(d) { return 'translate(' + (d.x - d.r) + ', ' + (d.y - d.r) + ')'; });
	
	photoUpdate.select('image')
		.attr('width', function(d) { return d.r * 2; })
		.attr('height', function(d) { return d.r * 2; });
	
	photoUpdate.select('circle')
		.attr('r', function(d){ return d.r; })
		.attr('cx', function(d){ return d.r; })
		.attr('cy', function(d){ return d.r; });
	
	var photoExit = photo.exit()
		.attr('transform', 'translate(' + (width / 2) + ', ' + (height / 2) + ')');
	
	photoExit.select('image')
		.attr('width', 0)
		.attr('height', 0);
}

function removeAllPhotos() {
	Photos.find().forEach(function(photo) {
		Photos.remove(photo._id);
	});
}
