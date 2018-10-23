import React, { Component } from 'react';
import './App.css';
import Dropzone from 'react-dropzone';
import Carousel from './Carousel.js';
import stopword from 'stopword';
import stemmer from 'stemmer';
const PromiseFileReader = require('promise-file-reader');
var Tokenizer = require('sentence-tokenizer');

class App extends Component {
  constructor() {
    super()
    this.state = { 
      files: [], 
      fileData: [],
      steps:["Sentence Splitting","Normalization","Stop Words Removal","Word Stemming"],
      summarized: false,
      upload: false,
      wordLength:5,
      summaryLength: 100
    }
  }
  wpFrequency(bagOfWords, totalNumberOfWords){
    let wordsProbability = {};
    for (let key in bagOfWords){
      wordsProbability[key] = bagOfWords[key]/totalNumberOfWords;
    }
    return wordsProbability;
  }
  sortWordProb(bagOfWords, wordsProbability){
    let wordArray = [];
    for (let key in bagOfWords){
        wordArray.push([key, wordsProbability[key]]);
    }
    wordArray.sort(function(a,b){
        return b[1]-a[1];
    });
    return wordArray;
  }
  documentToSentence_bagOfWords(documentList){
    let sentenceList = [], bagOfWords = {}, normalFormWords = {}, totalNumberOfWords = 0, slist = [], lowercase = [], nostop = [], stemmed = [];

    for (let k in documentList){
        const originalText = documentList[k];
        let tokenizer = new Tokenizer();
        tokenizer.setEntry(originalText)
        const sentences = tokenizer.getSentences()
        slist.push(sentences);
        let temp = [],
            temp2 = [],
            temp3 = [];
        for (let i in sentences) {
            const sentence = sentences[i].trim();
            let words = sentence.replace(/[^a-zA-Z0-9 ]/g,"").toLowerCase().split(" ");
            temp.push(words.join(" "));
            // console.log(words);
            words = stopword.removeStopwords(words);
            temp2.push(words.join(" "));
            // console.log(words);
            let contentWords = [];
            for (let j in words) {
                const word = stemmer(words[j]);//stemming
                if (word!=""){//not a stopword
                    contentWords.push(word);
                    if (word in bagOfWords){
                        bagOfWords[word]++;
                    } else {
                        bagOfWords[word]=1;
                        normalFormWords[word] = words[j];
                    }
                }
            }
            temp3.push(contentWords.join(' '));
            totalNumberOfWords += contentWords.length;
            if (sentence!="")
                sentenceList.push({sentence:sentence, contentWords:contentWords, sentenceWeight:0, selected:false, documentIndex:k, sentenceIndex:i});
        }
        lowercase.push(temp);
        nostop.push(temp2);
        stemmed.push(temp3);
    }
    let hold = Object.keys(bagOfWords);
    hold = hold.sort((a,b)=>{
      return bagOfWords[b]-bagOfWords[a]
    })
    let stepData = [];
    stepData.push(slist);
    stepData.push(lowercase);
    stepData.push(nostop);
    stepData.push(stemmed);
    this.setState({
      bagOfWords: bagOfWords,
      wordmapping: normalFormWords,
      totalNumberOfWords: totalNumberOfWords,
      wordordering: hold,
      stepData: stepData,
      sentenceListOrder: sentenceList
    })
    return {totalNumberOfWords,sentenceList,bagOfWords,normalFormWords};
  }
  swAveraged(sentenceObject, wordsProbability, minSentenceLen){
      for (let i in sentenceObject){
          let wordLen = sentenceObject[i].contentWords.length;
          if (wordLen<minSentenceLen){
              sentenceObject[i].sentenceWeight = 0;
          } else {
              let sumProb = 0;
              for (let j in sentenceObject[i].contentWords){
                  sumProb+= wordsProbability[sentenceObject[i].contentWords[j]];
              }
              sentenceObject[i].sentenceWeight = sumProb/wordLen;
          }
      }
      return sentenceObject;
  }
  sumBasic(documentList, targetWordCount=10, minSentenceLen=3){
    const sentenceProcess = this.documentToSentence_bagOfWords(documentList);
    let sentenceObject = sentenceProcess.sentenceList;
    const bagOfWords = sentenceProcess.bagOfWords;//distinct
    const normalFormWords = sentenceProcess.normalFormWords;
    const totalNumberOfWords = sentenceProcess.totalNumberOfWords;
    //compute probability of words
    let wordsProbability = this.wpFrequency(bagOfWords,totalNumberOfWords);//initial wpFrequency()
    console.log(wordsProbability,sentenceObject)
    //select sentences - special of SumBasic
    let selectedSentences = [];
    let selectedSentencesObject = {};
    let cummulativeWordLen = 0;
    while (cummulativeWordLen<targetWordCount){
        //move bag of words from object to array
        let wordArray = this.sortWordProb(bagOfWords, wordsProbability);
        //(re)compute sentence weight
        sentenceObject = this.swAveraged(sentenceObject, wordsProbability, minSentenceLen);
        //sort the weights
        sentenceObject.sort(function(a,b){
            return b.sentenceWeight-a.sentenceWeight;
        });

        //sumbasic: select best sentence weight that contains the highest prob word
        let found=false;
        let index = 0;
        do {
            if (sentenceObject[index] && (sentenceObject[index].sentence.toLowerCase().indexOf(normalFormWords[wordArray[0][0]])!=-1 || sentenceObject[index].sentence.toLowerCase().indexOf(wordArray[0][0])!=-1) && sentenceObject[index].selected==false){
                found = true;
            } else {
                index++;
                if (index>=sentenceObject.length)
                    break;//fails
            }
        } while (found==false);

        if (found){
            selectedSentences.push(sentenceObject[index].sentence);
            selectedSentencesObject[`${sentenceObject[index].documentIndex}-${sentenceObject[index].sentenceIndex}`] = true
            sentenceObject[index].selected=true;
            cummulativeWordLen+=sentenceObject[index].sentence.split(' ').length;

            //modify all prob of used word
            let usedWords = sentenceObject[index].contentWords;
            for (let i in usedWords){
                wordsProbability[usedWords[i]] = wordsProbability[usedWords[i]]*wordsProbability[usedWords[i]];
            }
        } else {
            if (wordArray[0][1]==0)
                break;
            wordsProbability[wordArray[0][0]]=0;
        }
    }
    console.log(selectedSentences,sentenceObject, wordsProbability )
    this.setState({
      summarized: true,
      selectedSentences: selectedSentences,
      sentenceListOrder: sentenceObject,
      selectedSentencesObject:selectedSentencesObject
    })
    return selectedSentences.join(' ');
  }
  async onDrop(files) {
    let fileData = [];
    // console.log("HELL")
    for(let i = 0; i < files.length; i++){
      console.log(files[i])
      let data = await PromiseFileReader.readAsText(files[i])
      fileData.push(data);
    }
    this.setState({
      files,
      fileData
    });
  }
  handleClick(){
    if(!this.state.summarized && this.state.fileData.length > 0){
      let summary = this.sumBasic(this.state.fileData,this.state.summaryLength, this.state.wordLength);
      this.setState({
        summary: summary,
        uploaded: true,
        summarized: true
      })
    }
  }
  render() {
    console.log(this.state);
    if(!this.state.uploaded){
      return (
        <section>
          <h1 className="title">Mukhtasar: A Multi-document Text Summarizer</h1>
          {!this.state.uploaded && <div className="drop">
            <Dropzone className="dropzone" accept="text/plain" onDrop={this.onDrop.bind(this)}>
              <p className="droptext">Uploaded Files: </p>
              {
                this.state.files.map((m)=>{
                  return(
                    <div className="dropfile">{m.name}</div>
                  )
                })
              }
            </Dropzone>
            <div className="bottom"style={{bottom:60}}>
              <label className="droptext">Minimum Word Count for a Sentence</label>
              <input style={{width:300}} type="range" min={3} max={20} value={this.state.wordLength} onChange={(e)=>{this.setState({wordLength: e.target.value})}}>
              </input>
              <div className="range-value">{this.state.wordLength} words</div>
            </div>
            <div className="bottom" style={{bottom:20}}>
              <label className="droptext">Target Summary Word Count</label>
              <input style={{width:300}} type="range" min={10} max={200} value={this.state.summaryLength} onChange={(e)=>{this.setState({summaryLength: e.target.value})}}></input>
              <div className="range-value">{this.state.summaryLength} words</div>
            </div>
            {this.state.files.length > 0 && <button className="dropbutton" onClick={()=>{this.handleClick()}}>Summarize</button>}
          </div>}
        </section>
      );
    }else{
      return (
        <section>
          <h1 className="title">Mukhtasar: A Multi-document Text Summarizer</h1>
          {<aside className="step">
            <h2 className="stephead">Original files</h2>
            {this.state.fileData.length > 0 && <Carousel type="normal" data={this.state.fileData}></Carousel>}
          </aside>}
          {
            this.state.stepData && this.state.steps.map((s,i)=>{
              return(
                <div className="step">
                <h2 className="stephead">{s}</h2>
                {
                  this.state.stepData[i].length > 0 && <Carousel type="list" data={this.state.stepData[i]}></Carousel>
                }
                </div>
              )
            })
          }
          {this.state.bagOfWords && <aside>
            <h2 className="stephead">Bag of Words</h2>
            <div className="collection">
              <div className="document bow">
                <ol className="bowlist">
                  {
                    this.state.wordordering.map((b)=>{
                      return(
                        <li>
                          <span className="red">{b}</span>
                          {` occurs ${this.state.bagOfWords[b]} times`}
                        </li>
                      )
                    })
                  }
                </ol>
              </div>
            </div>
          </aside>
          }
          {<aside className="step">
            <h2 className="stephead">Original files with Highlighted Senctences</h2>
            {this.state.fileData.length > 0 && <Carousel type="highlight" selectedSentencesObject={this.state.selectedSentencesObject} sentences={this.state.stepData[0]} data={this.state.fileData}></Carousel>}
          </aside>}
          {
            this.state.summarized && 
            <aside>
              <h2 className="stephead">Summary</h2>
              <div className="collection">
                <div className="document bow">
                  {
                    this.state.summary
                  }
                </div>
              </div>
            </aside>
          }
        </section>
      );
    }
  }
}

export default App;
