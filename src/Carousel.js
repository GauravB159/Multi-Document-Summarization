import Flickity from 'react-flickity-component'
import React, { Component } from 'react';

export default class Carousel extends Component{
    constructor(props){
        super(props)
        this.state = {
            data: props.data
        }
    }
    componentWillReceiveProps(props){
        this.setState({
            data:props.data
        })
    }
    render(){
        if(this.props.type === "normal"){
            return(
                <Flickity className="collection" reloadOnUpdate={true}>
                {
                    this.state.data.map((d)=>{
                        return(
                            <div className="document">{d}</div>
                        )
                    })
                }
                </Flickity>
            )
        }else if(this.props.type === "highlight"){
            return(
                <Flickity className="collection" reloadOnUpdate={true}>
                {
                    this.props.sentences.map((d,i)=>{
                        let concat = [];
                        d.forEach((sentence,j)=>{
                            if(this.props.selectedSentencesObject[`${i}-${j}`]){
                                concat.push(<span className="red">{sentence}</span>)
                            }else{
                                concat.push(sentence)
                            }
                        })
                        return (
                            <div className="document">
                            {
                                concat
                            }
                            </div>
                        );
                    })            
                }
                </Flickity>
            )
        }else{
            return(
                <Flickity className="collection" reloadOnUpdate={true}>
                {
                    this.state.data.map((d)=>{
                        return(
                            <div className="document">
                                <ol>
                                   {d.map((sent)=>{
                                       return(
                                           <li>{sent}</li>
                                       )
                                   })} 
                                </ol>
                            </div>
                        )
                    })
                }
                </Flickity>
            )
        }
    }
}