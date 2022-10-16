const puppeteer = require('puppeteer');
const compressing = require('compressing');
const fs = require('fs')
const os = require('os')
var path = require('path');
const _uniq = require('lodash/uniq')
import { targetDir , targetZip , imgDir } from './config'
//tinypng 规则是一次最多传20张，每张大小不超过5M
let arr = []
function randomNumber(){
    var y =Math.random();
    if(y<0.5){
        return y =Math.floor(y)
    }
    else{
        return y= Math.ceil(y)
    }
}
function fileDisplay(filePath){
    //根据文件路径读取文件，返回文件列表
    fs.readdir(filePath,function(err,files){
      if(err){
        console.warn(err)
      }else{
        //遍历读取到的文件列表
        files.forEach(function(filename){
          //获取当前文件的绝对路径
          var filedir = path.join(filePath,filename);
          //根据文件路径获取文件信息，返回一个fs.Stats对象
          fs.stat(filedir,function(eror,stats){
            if(eror){
              console.warn('获取文件stats失败');
            }else{
              var isFile = stats.isFile();//是文件
              var isDir = stats.isDirectory();//是文件夹
              if(isFile){
                arr.push(filedir)
              }
              if(isDir){
                fileDisplay(filedir);//递归，如果是文件夹，就继续遍历该文件夹下面的文件
              }
            }
          })
        });
        return arr;
      }
    });
  }

const url = ['https://tinypng.com','https://tinyjpg.com']
fileDisplay(imgDir)

const uploadArr = arr

let browser;
(async () => {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            ignoreHTTPSErrors: true,//忽略https错误
            devtools: false,//不自动打开控制台（浏览器显示时有效）
            ignoreDefaultArgs: [
                '--enable-automation'
                // `–proxy-server=36.66.173.145:45685`

            ] //不显示受自动化脚本控制
        });
        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() => { //在每个新页面打开前执行以下脚本
            const newProto = navigator.__proto__;
            delete newProto.webdriver;  //删除navigator.webdriver字段
            navigator.__proto__ = newProto;
            window.chrome = {};  //添加window.chrome字段，为增加真实性还需向内部填充一些值
            window.chrome.app = { "InstallState": "hww" + Math.random(), "RunningState": "wwwww" + Math.random(), "getDetails": "xqqixi" + Math.random(), "getIsInstalled": "ohno"+ Math.random() };
            window.chrome.csi = function () { };
            window.chrome.loadTimes = function () { };
            window.chrome.runtime = function () { };
            Object.defineProperty(navigator, 'userAgent', {  //userAgent在无头模式下有headless字样，所以需覆写
                get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36",
            });
            Object.defineProperty(navigator, 'plugins', {  //伪装真实的插件信息
                get: () => [{
                    "description": "Portable Document Format",
                    "filename": "internal-pdf-viewer",
                    "length": 1,
                    "name": "Chrome PDF Plugin"
                }]
            });
            Object.defineProperty(navigator, 'languages', { //添加语言
                get: () => ["zh-CN", "zh", "en"],
            });
            const originalQuery = window.navigator.permissions.query; //notification伪装
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            )
        });
        await page.goto(url[randomNumber()],{
            waitUntil: 'domcontentloaded',
            timeout : 0
        });
     
        await page.waitForTimeout(2000);
        //这种方式可以获取隐藏input file
        const uploadBtn = await page.$(".target input");
        console.log("uploadArr",uploadArr)
        for(let i = 0; i<uploadArr.length;i++){
            await page.waitForTimeout(1000);
            await uploadBtn.uploadFile(uploadArr[i]);
        }
        await page.waitForTimeout(10000);
        await page.waitForSelector('.buttons .download')
        await page.waitForTimeout(1000);
        await page.click('.buttons .download');
        //设置1分钟等待是为了等10张图片下载完才关闭浏览器
        await page.waitForTimeout(60000);
   
        try{
            await compressing.zip.uncompress(targetZip, targetDir) 
        }catch(err){
            console.log("err",err)
        }
        
        if(fs.existsSync(targetZip)){
            fs.unlink(targetZip,(err)=>{
                if(err){
                    return console.log(err)
                }
                console.log("删除成功")
            })
        }

        await page.close();
        await browser.close();
    }
})()
