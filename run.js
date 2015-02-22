
var _ = require('underscore'),
	Converter = require('csvtojson').core.Converter,
	fs = require('fs');

var csvFileName = './Report.csv';
var configFileName = './activities.csv';

var config = fs.readFileSync(configFileName).toString();
var data = fs.readFileSync(csvFileName).toString();

var re1 = /User:[\s\S]*?(?=DYCD ID)/;
var re = /User:[\s\S]*?(Absent Hours)/g;

var headSections = data.match(re);

data = data.replace(re1, '');
data = data.replace(re, 'blah, blah, blah, blah, blah, blah, blah');

var getActivityFromHeadSection = 
	function getActivityFromHeadSection(headSection, activities) {	
		return _.find(activities, function(act){
			return headSection.indexOf(act['Activity Name']) > -1;
		});
	};

var getConverter = function getConverter(){
	return new Converter({
		constructResult: true
	}); 
}

// need to support category which is a union of two other categories

// for each category, need the overall average, and the number and percentage 
// of students (both overall ids in file and out of total slots at site 
// (harcoded per site, Contract ID is identifier) that are
// > 60 hours
// > 45 hours
// > 30 hours
// > 20 hours
var calculateMetrics = function calculateMetrics(cats, students){
	var results = {},
		studentList = _.values(students);

	var totalStudents = studentList.length;
	var totalSlots = 100;

	// calculate overall average hours per cat
	_.each(cats, function(cat){
		results[cat] = {
			average: _.reduce(studentList, function(memo, val){
				return memo + val[cat];
			}, 0) / studentList.length
		};
	});

	// calculate num students over each threshold
	_.each(cats, function(cat){
		results[cat].over60Count = _.filter(studentList, function(student){
			return student[cat] >= 60;
		}).length;
		results[cat].over45Count = _.filter(studentList, function(student){
			return student[cat] >= 45;
		}).length;
		results[cat].over30Count = _.filter(studentList, function(student){
			return student[cat] >= 30;
		}).length;
		results[cat].over20Count = _.filter(studentList, function(student){
			return student[cat] >= 20;
		}).length;
	});

	// calculate percentage above each threshold
	_.each(cats, function(cat){

		results[cat].over60PercentageOfTotal = results[cat].over60Count / totalStudents;
		results[cat].over60PercentageOfSlots = results[cat].over60Count / totalSlots;
		results[cat].over45PercentageOfTotal = results[cat].over45Count / totalStudents;
		results[cat].over45PercentageOfSlots = results[cat].over45Count / totalSlots;
		results[cat].over30PercentageOfTotal = results[cat].over30Count / totalStudents;
		results[cat].over30PercentageOfSlots = results[cat].over30Count / totalSlots;
		results[cat].over20PercentageOfTotal = results[cat].over20Count / totalStudents;
		results[cat].over20PercentageOfSlots = results[cat].over20Count / totalSlots;


	});



	console.log("Total Students: " + totalStudents);
	console.log("Total Slots: " + totalSlots);
	console.log(results);
	return results;
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
		calculateMetrics(cats, students);
	});
});