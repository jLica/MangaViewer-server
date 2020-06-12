const puppeteer = require('puppeteer');

function manamoa_search(mainURL, key) {
    const URL = mainURL + "/bbs/search.php?url=https%3A%2F%2Fmanamoa31.net%2Fbbs%2Fsearch.php&stx=" + key;
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({
            headless : true
        });
        let page = await browser.newPage();
        await page.goto(URL, {waitUntil : 'load', timeout : 0});
        let result = await page.evaluate(() => {
            var ele = document.getElementsByClassName('post-row');
            var array_json = [];
            for (var i = 0; i < ele.length; i++) {
                var title = document.getElementsByClassName('manga-subject')[i].getElementsByTagName('a')[0];
                var title_text = title.text.split('\t');
                var image = document.getElementsByClassName('img-wrap-back')[i].getAttribute('style').split('(');
                var link = title.getAttribute('href');
                var period = document.getElementsByClassName('publish-type')[i].textContent;
                var artist = document.getElementsByClassName('post-list')[i].getElementsByClassName('post-content  text-center')[0].getElementsByClassName('author')[0];
                var artist_text;
                if (artist != undefined && artist != null) {
                    artist_text = artist.getElementsByTagName('div')[0].textContent;
                } else {
                    artist_text = '미상';
                }
                var aJson = new Object();
                aJson.title = title_text[12];
                aJson.image = image[1].split(')')[0];
                aJson.link = link;
                aJson.period = period;
                aJson.artist = artist_text;
                array_json.push(aJson);
            }
            return array_json;
        });
        resolve(result);
        browser.close();
    });
}

function manamoa_contents(mainURL, subURL) {
    const URL = mainURL + subURL;
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({headless : true});
        let page = await browser.newPage();
        await page.goto(URL, {waitUntil : 'load', timeout : 0});
        let result = await page.evaluate(() => {
            var ele = document.getElementsByClassName('view-content scroll-viewer');
            var child = ele[0].getElementsByTagName('img');
            var json = new Object();
            var eplink = document.getElementsByClassName('comic-navbar')[0].getElementsByClassName('toon-nav')[0].getElementsByTagName('a')[3].getAttribute('href');
            var eptitle = document.getElementsByClassName('toon-title')[0].textContent.split('\t');
            var titleImage = document.getElementsByClassName('toon-img hidden-xs')[0].getElementsByTagName('img')[0].getAttribute('src');
            var array = [];
            for (var i = 0; i < child.length; i++) {
                if(child[i].src != "") {
                    array.push(child[i].src);
                }
                else {
                    array.push(child[i].getAttribute('lazy-src'));
                }
            }
            json.eptitle = eptitle[5];
            json.contents = array;
            json.eplink = eplink;
            json.titleImage = titleImage;
            return json;
        });
        resolve(result);
        browser.close();
    });
}

function manamoa_episode(mainURL, subURL) {
    const URL = mainURL + subURL;
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({headless : true});
        let page = await browser.newPage();
        await page.goto(URL);
        let result = await page.evaluate(() => {
            var ele = document.getElementsByClassName('chapter-list')[1].getElementsByClassName('title');
            var array_json = [];
            var leng = ele.length;
            var titleImage = document.getElementsByClassName('manga-thumbnail')[0].getAttribute('style').split('(');
            var artist = document.getElementsByClassName('manga-thumbnail')[0].getElementsByClassName('author')[0];
            var artist_text;
            if(artist != undefined && artist != null) {
                artist_text = artist.textContent;
            }
            else {
                artist_text = '미상';
            }
            var period = document.getElementsByClassName('manga-thumbnail')[0].getElementsByClassName('publish_type')[0].textContent;
            for (var i = 0; i < ele.length; i++) {
                var title = ele[i].textContent.split('\t');
                var update_date = document.getElementsByClassName('addedAt')[i].textContent.split('\t');
                var link = document.getElementsByClassName('chapter-list')[1].getElementsByClassName('slot ')[i].getElementsByTagName('a')[0].getAttribute('href');
                var aJson = new Object();

                aJson.eptitle = title[8] + ' ' + title[12]; //에피소드 타이틀
                aJson.code = leng - i - 1;
                aJson.update_date = update_date[3];
                aJson.link = link;
                array_json.push(aJson);
            }
            var aJson = new Object();
            aJson.titleImage = titleImage[1].split(')')[0];
            aJson.artist = artist_text;
            aJson.period = period;
            array_json.push(aJson);
            return array_json;
        });
        resolve(result)
    });
}

function manamoa_update(mainURL, page) { //업데이트된 에피소드 올리고, 만화 내용도 올려야 함
    const URL = mainURL + "/bbs/board.php?bo_table=manga&page=" + page;
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({headless : true});
        let page = await browser.newPage();
        await page.goto(URL, {waitUntil : 'load', timeout : 0});
        let result = await page.evaluate(() => {
            var ele = document.getElementsByClassName('post-row');
            var array_json = [];
            for (var i = 0; i < ele.length; i++) {
                var title = ele[i].getElementsByClassName('post-subject')[0].getElementsByTagName('a')[0].textContent;
                if(title.slice(1, 4) == 'NEW') {
                    title = title.slice(5, title.length - 1);
                } else {
                    title = title.slice(2, title.length - 1);
                }
                var image = ele[i].getElementsByClassName('img-item')[0].getElementsByTagName('img')[0].getAttribute('src');
                var update_date = ele[i].getElementsByClassName('txt-normal')[0].textContent;
                var link = ele[i].getElementsByClassName('post-subject')[0].getElementsByTagName('a')[0].getAttribute('href');
                var eplink = ele[i].getElementsByClassName('pull-right post-info')[0].getElementsByTagName('p')[0].getElementsByTagName('a')[0].getAttribute('href');
                var aJson = new Object();

                aJson.eptitle = title; //에피소드 타이틀
                aJson.updateimage = image; //에피소드 이미지
                aJson.update_date = update_date.split(" ")[0];
                aJson.link = link; //만화 본문 링크
                aJson.eplink = eplink; //전편보기 링크
                array_json.push(aJson);
            }
            return array_json;
        });
        resolve(result);
        browser.close();
    });
}

function update_support(mainURL, aJson) {
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({headless : true});
        let page = await browser.newPage();
        await page.goto(mainURL + aJson.eplink);
        let result = await page.evaluate((aJson) => {
            var ele = document.getElementsByClassName('img-and-btn')[0];
            var artist = ele.getElementsByClassName('manga-thumbnail')[0].getElementsByClassName('author')[0];
            var period = ele.getElementsByClassName('manga-thumbnail')[0].getElementsByClassName('publish_type')[0].textContent;
            var title = ele.getElementsByClassName('information')[0].getElementsByClassName('manga-subject')[0].getElementsByClassName('red title')[0].textContent;
            var image = ele.getElementsByClassName('manga-thumbnail')[0].getAttribute('style').split('(');
            var leng = document.getElementsByClassName('chapter-list')[1].getElementsByClassName('slot ');
            var code;
            for(i = 0; i < leng.length; i++) {
                var tm = leng[i].getElementsByClassName('title')[0].textContent.split('\t');
                var tm2 = tm[8] + ' ' + tm[12];
                if(tm2 == aJson.eptitle) {
                    var tm3 = leng[i].getAttribute('id');
                    tm3 = tm3.split('-')[1];
                    code = leng.length - Number(tm3) - 1;
                }
            }

            var artist_text;
            if(artist != undefined && artist != null) {
                artist_text = artist.textContent;
            }
            else {
                artist_text = '미상';
            }
            aJson.artist = artist_text;
            aJson.period = period;
            aJson.title = title; //찐 타이틀
            aJson.image = image[1].split(')')[0]; //타이틀 이미지
            aJson.code = code; //코드를 붙이기 위한 길이
            return aJson;
        }, aJson); //매개변수 넣으려면 여기에도 넣어야 하는 듯.
        resolve(result);
        browser.close();
    });
}

module.exports.search = manamoa_search;
module.exports.getEpisodes = manamoa_episode;
module.exports.getContents = manamoa_contents;
module.exports.getUpdates = manamoa_update;
module.exports.supportUpdate = update_support;