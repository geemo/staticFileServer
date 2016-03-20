"use strict"



module.exports = exports = (rangeStr, size) => {

	if(rangeStr.indexOf(',') !== -1){
		return null;
	}
	
	rangeStr = rangeStr.split('=')[1];

	let range = rangeStr.split('-'),
		start = parseInt(range[0], 10),
		end = parseInt(range[1], 10);

	console.log(`start: ${start}, end: ${end}, rangeStr: ${rangeStr}`);
	//Range Invalid
	if(isNaN(start) && isNaN(end) || start > end || end > size){
		return null;
	}
	//Range: -1000        final 1000 bytes
	if(isNaN(start)){
		start = size - 1000;
		end = size - 1;

	//Range: 1000-        bytes offset 1000 to last byte
	} else if(isNaN(end)){
		end = size - 1;
	}

	return {start: start, end: end};
};