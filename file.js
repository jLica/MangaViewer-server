const path =  require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
//배열로 된 폴더명을 받아서 하위폴더를 구성해준다.

function arryCreateFolder(imgFolder, folderArr){

	var nFolder = imgFolder;

	for( folder in folderArr ){

		var status = searchFolder(nFolder, folderArr[folder]);

		if(!status){

			var createStatus = createFolder(nFolder, folderArr[folder]);

			nFolder = path.join(nFolder, folderArr[folder]);

		}

	}

}

// 폴더를 생성하는 역할을 맡는다.

function createFolder(folder, createFolder, callback){

    var tgFolder = path.join(folder,createFolder);

    //console.log("createFolder ==> " + tgFolder);

    mkdirp(tgFolder, callback);

}



// 폴더가 존재하는지 찾는다. 있다면 폴더위치를 리턴하고, 없다면 false를 리턴한다.

function searchFolder(folder, srhFolder){

	var rtnFolder;

	fs.readdir(folder, (err, files) => {

		if(err) throw err;

		files.forEach(function(file){

			if(file == srhFolder){

				fs.stat(path.join(folder, file), function(err, stats){

					if(stats.isDirectory()){

						return path.join(folder, file);

					}

				});

			}

		});

	});

	return false;

}


module.exports.createManyFolders = arryCreateFolder;
module.exports.createFolder = createFolder;
module.exports.searchFolder = searchFolder;