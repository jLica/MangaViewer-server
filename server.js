const express = require('express');
const app = express();
const download = require('image-downloader');
const mongoose = require('mongoose');
const manamoa = require('./manamoa');
const file = require('./file');

app.use(express.static('./images'));
const port = 3000;

const mainURL = "https://manamoa47.net/";

const data = new mongoose.Schema({
    title : String,
    imageLink : String,
    link : String,
    period : String,
    artist : String,
    episodes : [Object],
    updateCode : [Number],
    bookmark : Boolean
});


const DATA = mongoose.model('Schema', data);

mongoose.connect('mongodb://localhost:27017/mangaViewer', {useNewUrlParser : true, useUnifiedTopology : true});
const db = mongoose.connection;
db.on('error', () => {
    console.log("db connection failed!!");
});
db.once('open', () => {
    console.log('db connected!');
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/post/search', (req, res) => { //검색. 검색할 때마다 결과 크롤링
    (async () => {
        const searchText = req.body.searchText;
        
        let result = await manamoa.search(mainURL, searchText);
        var json = new Array();

        await result.forEach((element, index) => {
            element.title = changeText(element.title);
            element.artist = changeText(element.artist);

            DATA.findOne({title : element.title, artist : element.artist}, (err, data) => {
                if(err) {
                    console.log(err);
                }
                else {
                    const fileName = "titleImage.jpg";
                    const dir = element.title + "/" + element.artist + "/title/"; // 제목/작가
                    const imageLink = "http://localhost:" + port + "/" + dir + fileName;

                    if(data == null) {
                        
                        var callback_ = (err) => {
                            if(err) {
                                console.log(err);
                            }
                            else {
                                setSearchedData(element, DATA, imageLink);
                            }
                        }
                        file.createFolder("./images/" + element.title + "/" + element.artist, "title", callback_);
                        
                    }
                    var tmp = makeSearchedJson(element, imageLink);
                    json.push(tmp);
                    if(json.length == result.length) {
                        res.json(json);
                    }
                }
            });
        });
    })();
});

app.post('/post/episodes', (req, res) => {
    (async() => {
        console.log("Hello");
        const subURL = req.body.link;
        var title = req.body.title; //특수문자 변환된 상태
        var artist = req.body.artist;

        let result = await manamoa.getEpisodes(mainURL, subURL);
        var episodesArray = [];

        let data = await DATA.findOne({title : title, artist : artist});

        await result.forEach((element, index) => {
            //db에 제목 정도는 저장되어 있음.
            if(index < result.length - 1) {
                var episodes = new Object();
                element.eptitle = changeText(element.eptitle);
                title = changeText(title);
                artist = changeText(artist);
    
                if(data.episodes.length == 0) {
                    file.createFolder("./images/" + title + "/" + artist, "episodes");
                }
    
                var tmp = true;
    
                data.episodes.forEach((data2) => {
                    if(data2.code == element.code) {
                        tmp = false; //이미 존재하는 에피소드
                    }
                });
    
                if(tmp) {
                    episodes.eptitle = element.eptitle;
                    episodes.code = element.code;
                    episodes.update_date = element.update_date;
                    episodes.link = element.link;
                    episodesArray.push(episodes);
    
                    file.createFolder("./images/" + title + "/" + artist + "/" +  "episodes", element.eptitle);
                    
                }
    
                else {
                    episodesArray.push(data.episodes[index]);
                }

                if(episodesArray.length == result.length - 1 && !episodesArray.includes(null)) {
                    episodesArray.sort((a, b) => {
                        return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
                    });
                    setEpisodesData(episodesArray, DATA, req.body);
                }
            }
            else {

                episodesArray.sort((a, b) => {
                    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
                });
                var tmp = new Object();
                tmp.epList = episodesArray;
                if(data.bookmark == null) {
                    element.bookmark = false;
                }
                else {
                    element.bookmark = data.bookmark;
                }
                tmp.info = element;
                res.json(tmp);
            }
            
        }); 

    })();
});

app.post('/post/contents', (req, res) => { //업데이트로 들어온 건 무조건 컨텐츠 존재, 목록에서 들어온 건 에피소드 존재
    (async () => {
        var element = req.body;
        var title = changeText(element.title);
        var artist = changeText(element.artist);
        var eptitle = changeText(element.eptitle);
        var subURL = element.link;
        DATA.findOne({title : title, artist : artist}, async (err, data) => {
            if(err) {
                console.log(err);
            }
            else {
                var i = 0;
                var tmp = true;
                data.episodes.forEach((ele, index) => {
                    if(ele.eptitle == eptitle) { //에피소드 존재
                        i = index;
                        if(ele.contents != null) {
                            if(ele.contents.length != 0) {//컨텐츠 존재
                                tmp = false;
                            }
                        }
                    }
                })
                if(tmp) { //컨텐츠 x
                    let result = await manamoa.getContents(mainURL, subURL);
                    result.contents.forEach(async (data2, index) => {
                        const tmp2 = {
                            url : data2,
                            dest : "./images/" + title + "/" + artist + "/episodes/" + eptitle + "/" + index + ".jpg"
                        }

                        await download.image(tmp2);
                    });
                    const fileName = "titleImage.jpg";
    
                    const options = {
                        url : result.titleImage,
                        dest : "./images/" + element.title + "/" + element.artist + "/title/" + fileName
                    };
                    download.image(options);

                    const dir = title + "/" + artist + "/episodes/" + eptitle + "/";

                    const imageLink = "http://localhost:" + port + "/" + dir + fileName;

                    var contentsLink = [];
                    for(i = 0; i < result.contents.length; i++) {
                        contentsLink[i] = "http://localhost:" + port + "/" + dir + i + ".jpg";
                    }
                    var json = new Object();
                    json.contents = contentsLink;
                    json.eplink = data.link;
                    json.titleImage = imageLink;
                    res.json(json);

                    setContentsData(DATA, title, artist, eptitle, contentsLink);
                }
                else { //컨텐츠 o
                    var tmp = new Object();
                    //eplink도 보내야 함
                    tmp = data.episodes[i];
                    tmp.eplink = data.link;
                    res.json(data.episodes[i]);
                    console.log("호오");
                }
            }
        })
    })();
});

var updates = new Array();

app.post('/post/updates', (req, res) => {
    (async () => {
        console.log("Helo wrodl");
        
        var tmp = new Array();
        for(i = 0; i < 9; i++) {
            console.log(i)
            await DATA.findOne({updateCode : i}, (err, data) => {
                if(err) {
                    console.log(err);
                }
                else {
                    if(data.updateCode.length == 1) {
                        var tmp2 = new Object();
                        tmp2.title = data.title;
                        tmp2.episode = data.episodes[data.episodes.length - 1];
                        tmp2.titleLink = data.link;
                        tmp2.artist = data.artist;
                        tmp.push(tmp2);
                    }
                    else {
                        for(j = 0; j < data.updateCode.length; j++) {
                            if(i == data.updateCode[j]) {
                                var tmp2 = new Object();
                                tmp2.title = data.title;
                                tmp2.episode = data.episodes[data.episodes.length - j - 1];
                                tmp2.titleLink = data.link;
                                tmp2.artist = data.artist;
                                if(data.bookmark != null) {
                                    tmp2.bookmark = data.bookmark;
                                }
                                else {
                                    tmp2.bookmark = null;
                                }
                                tmp.push(tmp2);
                            }
                        }
                    }
                    
                }
            });
        }
        res.json(tmp);

    })();
});

app.post('/post/getBookmarks', (req, res) => {
    DATA.find({bookmark : true}, (err, datas) => {
        if(datas == null) { //북마크 등록된 작품 없음
            var tmp = new Array();
            var tmp2 = new Object();
            tmp2.title = "";
            tmp2.imageLink = "";
            tmp2.link = "";
            tmp2.period = "";
            tmp2.artist = "";
            tmp.push(tmp2);
            res.json(tmp);
        }
        else {
            var tmp = new Array();
            datas.forEach((ele) => {
                var tmp2 = new Object();
                tmp2.title = ele.title;
                tmp2.imageLink = ele.imageLink;
                tmp2.link = ele.link;
                tmp2.period = ele.period;
                tmp2.artist = ele.artist;
                tmp.push(tmp2);
            });
            res.json(tmp);
        }
    });
});

app.post('/post/setBookmark', (req, res) => {
    var element = req.body;
    DATA.findOne({title : element.title, artist : element.artist}, (err, data) => {
        if(err) {
            console.log(err);
        }
        else {
            if(data == null) {
                var tmp = new Object();
                tmp.isSuccessful = false;
                res.json(tmp);
            }
            else {
                DATA.updateOne({title : element.title, artist : element.artist}, {bookmark : element.bookmark}, (err2) => {
                    if(err2) {
                        console.log(err2);
                    }
                    else {
                        var tmp = new Object();
                        tmp.isSuccessful = true;
                        res.json(tmp);
                    }
                })
            }
        }
    })
})

// setInterval(() => {
//     getUpdates(DATA);
// }, 900000);
//getUpdates(DATA);
//deleteDB(DATA);

app.listen(port, () => {
    console.log("서버 열림");
});

function setSearchedData(element, DATA, imageLink) {

    const fileName = "titleImage.jpg";
    
    const options = {
        url : element.image,
        dest : "./images/" + element.title + "/" + element.artist + "/title/" + fileName
    };
    
    download.image(options);

    //추가하기
    const searchData = new DATA({title : element.title, imageLink : imageLink, link : element.link, period : element.period, artist : element.artist});
    searchData.save((err, data) => {
        if(err) {
            console.log(err);
        }
        else {
            console.log('saved!');
        }
    });
}

function makeSearchedJson(element, imageLink) {
    var tmp = new Object();
    tmp.title = element.title;
    tmp.imageLink = imageLink;
    tmp.link = element.link;
    tmp.period = element.period;
    tmp.artist = element.artist;
    tmp.episodes = element.episodes;
    return tmp;
}

function setEpisodesData(episodesArray, DATA, body) {

    DATA.updateOne({artist : body.artist, title : body.title}, {episodes : episodesArray}, (err, raw) => {
        if(err) {
            console.log(err);
        }
        else {
            console.log("updated!");
        }
    });
}

async function getUpdates(DATA) {
    let result = await manamoa.getUpdates(mainURL, 1);
    for (let [index, element] of result.entries()) {
        let result2 = await manamoa.supportUpdate(mainURL, element);
        let result3 = await manamoa.getContents(mainURL, result2.link);
        result2.contents = result3.contents;

        result2.title = changeText(result2.title);
        result2.artist = changeText(result2.artist);
        result2.eptitle = changeText(result3.eptitle);

        DATA.findOne({artist : result2.artist, title : result2.title}, async (err, data) => {
            if(err) {
                console.log(err);
            }
            else {
                var fileName = "titleImage.jpg"
                const dir = result2.title + "/" + result2.artist + "/title/"; // 제목/작가
                const dir2 = result2.title + "/" + result2.artist + "/episodes/" + result2.eptitle + "/";
                const imageLink = "http://localhost:" + port + "/" + dir + fileName; //작품 타이틀 이미지
                const updateimageLink = "http://localhost:" + port + "/" + dir2 + fileName; //업데이트된 이미지

                if(data == null) { //db에 저장되지 않은 작품
                    
                    var callback_ = (err) => {
                        if(err) {
                            console.log(err);
                        }
                        else {
                            setUpdatedData(result2, DATA, imageLink, updateimageLink, dir2, index);
                        }
                    }
                    var s = (err) => {
                        if(err) {
                            console.log(err);
                        }
                        else {
                            file.createFolder("./images/" + result2.title + "/" + result2.artist + "/episodes", result2.eptitle, callback_);
                        }
                    }
                    file.createFolder("./images/" + result2.title + "/" + result2.artist, "title", s);
                }
                else { //db에 저장된 작품
                    var tmp1 = true;
                    var tmp2 = true;
                    data.episodes.forEach((data2) => {
                        if(data2.code == result2.code) {
                            tmp1 = false;
                            if(data2.contents.length != 0) {
                                tmp2 = false; //둘 다 false이면 이미 크롤링한 거
                            }
                        }    
                    })
                    if(!tmp1 && tmp2) {
                        //회차는 등록되어 있으나 내용이 없음
                        updateUpdatedData(result2, DATA, updateimageLink, dir2, index);
                        console.log("HELLO1");
                    }
                    else if(tmp1 && tmp2) {
                        //회차도 등록되어 있지 않음
                        var callback_ = (err) => {
                            if(err) {
                                console.log(err);
                            }
                            else {
                                updateUpdatedData(result2, DATA, updateimageLink, dir2, index);
                                console.log("HELLO2");
                            }
                        }
                        var s = (err) => {
                            if(err) {
                                console.log(err);
                            }
                            else {
                                file.createFolder("./images/" + result2.title + "/" + result2.artist + "/episodes", result2.eptitle, callback_);
                            }
                        }
                        file.createFolder("./images/" + result2.title + "/" + result2.artist, "title", s);
                    }
                    else if(!tmp1 && !tmp2) { //이미 내용도 등록되어 있음. 업데이트코드 추가만 하면 됨
                        if(index < 60) {
                            await DATA.findOne({updateCode : index}, async (err2, data2) => {
                                if(err2) {
                                    console.log(err2);
                                }
                                else {
                                    if(data2 != null) {
                                       
                                        var tmp;
                                                
                                        if(data.updateCode == null) {
                                            tmp = true;
                                        }
                                        else {
                                            
                                            if(index <= data.updateCode[data.updateCode.length - 1]) {
                                                
                                                tmp = true; //이 작품에 updateCode가 존재는 하는데 예전에 크롤링한 거임
                                            }
                                            else {
                                                tmp = false; //이 작품에 updateCode가 존재하며 이번에 크롤링한 거임
                                            }
                                        }
                                        if(tmp) { //null로 초기화해도 되는 상황
                                            await DATA.updateMany({updateCode : index}, {updateCode : null}, async (err4) => {
                                                if(err4) {
                                                    console.log(err4);
                                                }
                                                else {
                                                    console.log("null됐땅");
                                                }
                                            });
                                            await DATA.updateOne({title : data.title, artist : data.artist}, {updateCode : index}, async (err4) => {
                                                if(err4) {
                                                    console.log(err4);
                                                }
                                                else {
                                                    console.log(data.title);
                                                    console.log(index);
                                                }
                                            });
                                        }
                                        else { //초기화하면 안 되고 배열로 추가해야 하는 상황, 즉 제목에 이미 업데이트 코드가 붙어 있는 경우
                                            console.log("같은 거 맞네");
                                            
                                            var tmp = [];
                                            tmp = data.updateCode;
                                            tmp.push(index);
                                            
                                            await DATA.updateMany({updateCode : index}, {updateCode : null}, async (err4) => {
                                                if(err4) {
                                                    console.log(err4);
                                                }
                                                else {
                                                    console.log("null됐땅");
                                                }
                                            });

                                            await DATA.updateOne({artist : result2.artist, title : result2.title}, {updateCode : tmp}, (err2) => {
                                                if(err2) {
                                                    console.log(err2);
                                                }
                                                else {
                                                    console.log(data.title + "ww");
                                                    console.log(index);
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        await DATA.findOne({title : data.title, artist : data.artist}, async (err3, data) => {
                                            if(err3) {
                                                console.log(err3);
                                            }
                                            else {
                                                if(data.updateCode == null) {
                                                    var tmp = [];
                                                    tmp.push(index);
                                                    await DATA.updateOne({title : data.title, artist : data.artist}, {updateCode : tmp}, async (err2, output) => {
                                                        if(err2) {
                                                            console.log(err2);
                                                        }
                                                        else {
                                                            console.log(data.title);
                                                            console.log(index);
                                                        }
                                                    });
                                                }
                                                else {
                                                    var tmp = data.updateCode;
                                                    tmp.push(index);
                                                    await DATA.updateOne({title : data.title, artist : data.artist}, {updateCode : tmp}, async (err2, output) => {
                                                        if(err2) {
                                                            console.log(err2);
                                                        }
                                                        else {
                                                            console.log(data.title);
                                                            console.log(index);
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                        
                                    }
                                }
                            });
                        }
                        console.log("Passed");
                    }
                }
            }
        });
    }
}

async function setUpdatedData(element, DATA, imageLink, updateimageLink, dir2, updateCode) {
    const fileName = "titleImage.jpg";
    
    const options = { //타이틀 이미지
        url : element.image,
        dest : "./images/" + element.title + "/" + element.artist + "/title/" + fileName
    };

    
    element.contents.forEach(async (data, index) => {
        const tmp = {
            url : data,
            dest : "./images/" + element.title + "/" + element.artist + "/episodes/" + element.eptitle + "/" + index + ".jpg"
        }

        await download.image(tmp);
    });
    var contentsLink = [];
    for(i = 0; i < element.contents.length; i++) {
        contentsLink[i] = "http://localhost:" + port + "/" + dir2 + i + ".jpg";
    }
    
    download.image(options);
    const options2 = { //업데이트 이미지
        url : element.updateimage,
        dest : "./images/" + element.title + "/" + element.artist + "/episodes/" + element.eptitle + "/" + fileName
    }
    download.image(options2);
    //추가하기
    var tmp = [];
    var json = Object();
    json.eptitle = element.eptitle;
    //json.eptitle = eptitle
    json.code = element.code;
    json.update_date = element.update_date;
    json.link = element.link;
    json.contents = contentsLink;
    json.updateimageLink = updateimageLink;
    tmp.push(json);

    if(updateCode < 60) {

        await DATA.findOne({updateCode : updateCode}, async (err, data) => {
            if(err) {
                console.log(err);
            }
            else {
                if(data != null) {
                   
                    await DATA.updateMany({updateCode : updateCode}, {updateCode : null});
                    const updateData = new DATA({title : element.title, imageLink : imageLink, link : element.eplink, period : element.period, artist : element.artist, episodes : tmp, updateCode : updateCode});
                    await updateData.save((err, data) => {
                        if(err) {
                            console.log(err);
                        }
                        else {
                            console.log('saved!');
                            console.log(data.title);
                            console.log(updateCode);
                        }
                    });
                    
                }
                else {
                    var tmp2 = [];
                    tmp2.push(updateCode);
                    const updateData = new DATA({title : element.title, imageLink : imageLink, link : element.eplink, period : element.period, artist : element.artist, episodes : tmp, updateCode : tmp2});
                    await updateData.save((err) => {
                        if(err) {
                            console.log(err);
                        }
                        else {
                            console.log('saved!');
                            console.log(element.title);
                            console.log(updateCode)
                        }
                    });
                }
            }
        });
    }
    else {
        const updateData = new DATA({title : element.title, imageLink : imageLink, link : element.eplink, period : element.period, artist : element.artist, episodes : tmp});
        updateData.save((err) => {
            if(err) {
                console.log(err);
            }
            else {
                console.log('saved!');
            }
        });
    }
    
}

async function updateUpdatedData(element, DATA, updateimageLink, dir2, updateCode) {
    const fileName = "titleImage.jpg";
    
    const options = {
        url : element.image,
        dest : "./images/" + element.title + "/" + element.artist + "/title/" + fileName
    };

    
    element.contents.forEach(async (data, index) => {
        const tmp = {
            url : data,
            dest : "./images/" + element.title + "/" + element.artist + "/episodes/" + element.eptitle + "/" + index + ".jpg"
        }

        await download.image(tmp);
    });

    var contentsLink = [];

    for(i = 0; i < element.contents.length; i++) {
        contentsLink[i] = "http://localhost:" + port + "/" + dir2 + i + ".jpg";
    }
    
    download.image(options);
    const options2 = {
        url : element.updateimage,
        dest : "./images/" + element.title + "/" + element.artist + "/episodes/" + element.eptitle + "/" + fileName
    }
    download.image(options2);
    //업데이트하기
    var tmp = [];
    var json = Object();
    json.eptitle = element.eptitle;
    json.code = element.code;
    json.update_date = element.update_date;
    json.link = element.link;
    json.contents = contentsLink;
    json.updateimageLink = updateimageLink;
    var tmp2 = json;
    updates.push(tmp2);

    DATA.findOne({title : element.title, artist : element.artist}, (err, data) => {
        if(err) {
            console.log(err);
        }
        else {
            tmp = data.episodes;
            tmp.push(json);
            tmp.sort((a, b) => {
                return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
            });
            if(updateCode < 60) {
                DATA.findOne({updateCode : updateCode}, async (err, data2) => {
                    if(err) {
                        console.log(err);
                    }
                    else {
                        if(data2 != null) {
                            await DATA.findOne({title : element.title, artist : element.artist}, async (err3, data3) => {
                                if(err3) {
                                    console.log(err3);
                                }
                                else {
                                    var tmp2;
                                    
                                    if(data3.updateCode == null) {
                                        tmp2 = true;
                                    }
                                    else {
                                        if(updateCode <= data3.updateCode[data3.updateCode.length - 1]) {
                                            tmp2 = true; //이 제목에 updateCode가 존재는 하는데 예전에 크롤링한 거임
                                        }
                                        else {
                                            tmp2 = false; //이 제목에 updateCode가 존재하며 이번에 크롤링한 거임
                                        }
                                    }
                                    if(tmp2) { //초기화해도 되는 상황
                                        await DATA.updateMany({updateCode : updateCode}, {updateCode : null}, async (err4) => {
                                            if(err4) {
                                                console.log(err4);
                                            }
                                            else {
                                                console.log("null됐땅");
                                            }
                                        });
                                        var tmp3 = [];
                                        tmp3 = data3.updateCode;
                                        tmp3.push(updateCode);

                                        await DATA.updateOne({title : element.title, artist : element.artist}, {updateCode : tmp3, episodes : tmp}, async (err4) => {
                                            if(err4) {
                                                console.log(err4);
                                            }
                                            else {
                                                console.log(element.title);
                                                console.log(updateCode);
                                            }
                                        });
                                    }
                                    else { //초기화하면 안 되고 배열로 추가해야 하는 상황, 즉 제목에 이미 업데이트 코드가 붙어 있는 경우
                                        console.log("같은 거 맞네");
                                        var tmp3 = [];
                                        tmp3 = data3.updateCode;
                                        tmp3.push(updateCode);
                                        await DATA.updateMany({updateCode : updateCode}, {updateCode : null}, async (err4) => {
                                            if(err4) {
                                                console.log(err4);
                                            }
                                            else {
                                                console.log("null됐땅");
                                            }
                                        });
                                        await DATA.updateOne({title : element.title, artist : element.artist}, {updateCode : tmp3, episodes : tmp}, async (err4) => {
                                            if(err4) {
                                                console.log(err4);
                                            }
                                            else {
                                                console.log(element.title);
                                                console.log(updateCode);
                                            }
                                        });
                                    }
                                }
                            });
                            
                        }
                        else {
                            
                            await DATA.findOne({title : element.title, artist : element.artist}, async (err, data) => {
                                if(err) {
                                    console.log(err);
                                }
                                else {
                                    if(data.updateCode == null) {
                                        var tmp2 = [];
                                        tmp2.push(updateCode);
                                        await DATA.updateOne({title : element.title, artist : element.artist}, {episodes : tmp, updateCode : tmp2}, (err2) => {
                                            if(err2) {
                                                console.log(err2);
                                            }
                                            else {
                                                console.log("updated successfully");
                                                console.log("같은 거다 ㅎㅎ");
                                                console.log(element.title);
                                                console.log(updateCode);
                                            }
                                        });
                                    }
                                    else {
                                        var tmp2 = data.updateCode;
                                        tmp2.push(updateCode);
                                        await DATA.updateOne({title : element.title, artist : element.artist}, {episodes : tmp, updateCode : tmp2}, (err2) => {
                                            if(err2) {
                                                console.log(err2);
                                            }
                                            else {
                                                console.log("updated successfully");
                                                console.log("같은 거다 ㅎㅎ");
                                                console.log(element.title);
                                                console.log(updateCode);
                                            }
                                        });
                                    }
                                }
                            });
                            
                        }
                    }
                });
                
            }
            else {
                DATA.updateOne({title : element.title, artist : element.artist}, {episodes : tmp}, (err, output) => {
                    if(err) {
                        console.log(err);
                    }
                    else {
                        console.log("updated successfully");
                    }
                });
            }
            
        }
    })
}

function setContentsData(DATA, title, artist, eptitle, contents) {
    DATA.findOne({title : title, artist : artist}, (err, data) => {
        var list = data.episodes;
        list.forEach((ele) => {
            if(ele.eptitle == eptitle) {
                ele.contents = contents;
                console.log(ele.eptitle);
            }
        });
        DATA.updateOne({title : title, artist : artist}, {episodes : list}, (err) => {
            if(err) {
                console.log(err);
            }
            else {
                console.log("contents saved!");
            }
        });
    })
}

async function deleteDB(DATA) {
   
    // DATA.find({updateCode : 7}, (err, data) => {
    //     console.log(data);
    
    // });
    
    // DATA.updateOne({updateCode : 10},{updateCode : null}, (err, data) => {
    //     if(err) {
    //         console.log(err);
    //     }
    //     else {
    //         if(data == null) {
    //             console.log("ㅠㅠ");

    //         }
    //         else {
    //             DATA.findOne({updateCode : 10}, (err, data) => {
    //                 console.log(data);
                
    //             });
    //         }
    //         console.log("HH");
    //     }
        
    // })
    DATA.deleteOne({artist : "유키모리 네네"}, (err, output) => {
        if(err) {
            console.log(err);
        }
        else {
            console.log("deleted");
        }
    });

}

function changeText(text) {
    while(text.includes('/')) {
      text = text.replace("/", "쀍");
    }
    while(text.includes('?')) {
        text = text.replace("?", "뿕");
    }
    while(text.includes('*')) {
        text = text.replace("*", "뽉");
    }
    while(text.includes('<')) {
        text = text.replace("<", "뻙");
    }
    while(text.includes('>')) {
        text = text.replace(">", "빩");
    }
    while(text.includes(':')) {
        text = text.replace(":", "뽥");
    }
    while(text.includes('|')) {
        text = text.replace("|", "쀩");
    }
    while(text.includes('"')) {
        text = text.replace('"', "꽑");
    }
    while(text.includes('\\')) {
        text = text.replace(/\\/g, "꿝");
    }
    while(text.includes('%')) {
        text = text.replace('%', '꿹');
    }
    if(text[text.length - 1] == '.') {
        text = text.slice(0, text.length - 1);
        text = text + "낅";
    }
    if(text[text.length - 1 == ' ']) {
        text = text.slice(0, text.length - 1);
    }
    return text;
  }

