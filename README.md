Million Photo Homepage
======================

A homepage filled with a million photos of its visitors.

Photos are stored in a [Meteor](http://meteor.com) collection in [data URI](https://en.wikipedia.org/wiki/Data_URI_scheme) format. [WebRTC getUserMedia](http://www.html5rocks.com/en/tutorials/webrtc/basics/#toc-mediastream) allows image capture from webcam without Flash. Meteor magically pushes new photos to all connected clients as they are taken.