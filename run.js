
var _ = require('underscore'),
	Converter = require('csvtojson').core.Converter,
	fs = require('fs'),
	Promise = require('bluebird');

var csvFileName = './Report.csv';
var configFileName = './activities.csv';

var config = fs.readFileSync(configFileName).toString();
var data = fs.readFileSync(csvFileName).toString();

var re1 = /User:[\s\S]*?(?=DYCD ID)/;
var re = /User:[\s\S]*?(Absent Hours)/g;

var headSections = data.match(re);

data = data.replace(re1, '');
data = data.replace(re, 'blah, blah, blah, blah, blah, blah, blah');

// for each student, we need 
// - activity name (after Activity Name:)
// - activity primary category

// for each student, have a row
// for each primary category, a column
// sum hours for attended hours

// need to support category which is a union of two other categories

// for each category, need the overall average, and the number and percentage 
// of students (both overall ids in file and out of total slots at site 
// (harcoded per site, Contract ID is identifier) that are
// > 60 hours
// > 45 hours
// > 30 hours
// > 20 hours

var getActivityFromHeadSection = 
	function getActivityFromHeadSection(headSection, activities) {	
		return _.find(activities, function(act){
			return headSection.indexOf(act['Activity Name']) > -1;
		});


		// return _.find(config.categories, function(cat){
		// 	return _.any(cat.identifiers, function(reString){
		// 		var catReg = new RegExp(reString);
		// 		var foundCat = catReg.exec(headSection);
		// 		return !!foundCat.length;
		// 	});
		// });
	};

var getConverter = function getConverter(){
	return new Converter({
		constructResult: true
	}); 
}


var activityConverter = getConverter();

activityConverter.fromString(config, function(e, activities){

	if (e){
		console.log(e);
	}

	var cats = _.chain(activities)
			.pluck('Category')
			.uniq()
			.value();

	var catCounts = 
		_.chain(cats)
			.invert()
			.mapObject(function(){ 
				return 0; 
			})
			.value();

	var students = {};
	var studentDefault = catCounts;

	var dataConverter = getConverter();
	dataConverter.fromString(data, function(err, studentActivities){
		if (err){
			console.log(err);
		}

		var currentActivity = getActivityFromHeadSection(headSections[0], activities);
		var headSectionIndex = 0;

		_.each(studentActivities, function(studentActivity){
			var id = studentActivity["DYCD ID"];
			
			// we have hit a new head section
			if (id === 'blah'){
				headSectionIndex++;
				currentActivity = getActivityFromHeadSection(
					headSections[headSectionIndex],
					activities
				);
				return;
			}

			students[id] = students[id] || _.clone(studentDefault);

			var student = students[id];

			student[currentActivity.Category]
				+= studentActivity['Attended Hours'];

		});
	});
});