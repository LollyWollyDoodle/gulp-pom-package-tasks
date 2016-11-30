var gulp = require("gulp");
var through2 = require("through2");
var Vinyl = require("vinyl");
var pomParser = require("pom-parser");

module.exports = {
    updateVersion: function (cb) {
	var s = gulp.src("package.json")
	.pipe(through2.obj(function (file, encoding, cb) {
		if (file.isStream()) {
			cb(new Error("Streams aren't supported"));
		}
		else if (file.isBuffer()) {
			var packageJson = JSON.parse(file.contents.toString(encoding));
			pomParser.parse({
				filePath: "pom.xml"
			}, function (err, pomResponse) {
				if (err) {
					cb(err);
					return;
				}
				
				var pomVersion = pomResponse.pomObject.project.version;
				var snapshotPos = pomVersion.indexOf("-SNAPSHOT");
				if (snapshotPos !== -1) {
					pomVersion = pomVersion.substr(0, snapshotPos);
				}
				packageJson.version = pomVersion;
				
				cb(null, new Vinyl({
					path: "package.json",
					contents: new Buffer(JSON.stringify(packageJson, null, 4) + "\n")
				}));
			});
		}
	}))
	.pipe(gulp.dest("."));

	s.on("finish", function () {
	    var child = require("child_process");
	    child.exec("git add package.json", function (error, stdout, stderr) {
		if (error) {
		    cb(error);
		    return;
		}

		cb(null);
	    });
	});
	s.on("error", function (err) {
	    cb(err);
	});
    },

    checkVersion: function (cb) {
	var fs = require("fs");
	fs.readFile("package.json", { encoding: "UTF-8" }, function (err, data) {
	    if (err) {
		cb(err);
		return;
	    }

	    var packageJson = JSON.parse(data);

	    pomParser.parse({
		filePath: "pom.xml"
	    }, function (err, pomResponse) {
		if (err) {
		    cb(err);
		    return;
		}

		if (pomResponse.pomObject.project.version.indexOf(packageJson.version) !== 0) {
		    cb(new Error("package.json version doesn't match pom.xml"));
		}
		else {
		    cb(null);
		}
	    });
	});
    },
};
