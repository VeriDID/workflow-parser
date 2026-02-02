import { IDisplayExtension } from "../interfaces/displayextension";
import { DisplayData, IDisplay } from "../interfaces/displayinterface";
import { Instance, Workflow } from "../interfaces/workflowinterface";

export class DefaultDisplay implements IDisplay {
    displayExtension: IDisplayExtension;

    constructor(displayExtension: IDisplayExtension) {
        this.displayExtension = displayExtension;
    }

    async processDisplay(
        clientID: string, 
        curentWorkflow: Workflow, 
        instance: Instance, 
        currentState: string): Promise<DisplayData> {
        
        console.log("*** processDisplay");
        // build the display data to return
        let displayData: DisplayData = {displayData: []};
        // for each display entry check condition and process if required
        const display = curentWorkflow.states.find(item => { return item.state_id == currentState});
        const displayTemplate = display.display_data;
        for(var i=0; i<displayTemplate.length; i++) {
            // condition can use instance.stateData
            if(displayTemplate[i]?.condition) {
                if(!eval(displayTemplate[i].condition)) {
                    continue;   // don't process if condition not met
                }
            }
            
            // handle the types of displays from the extension first
            if(this.displayExtension) {
                let newValue = await this.displayExtension.displays(instance, displayTemplate[i]);
                if(newValue) {
                    displayTemplate[i]=newValue;
                }
            }

            console.log("Rendering display type:", displayTemplate[i].type)
            console.log("Rendering display object:", displayTemplate[i])
            switch(displayTemplate[i].type) {
                case "text":
                case "title":
                case "information":
                case "warning":
                case "error":
                case "quote":
                case "pass":
                case "fail":
                case "control":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    break;
                case "text-field":
                case "text-area":
                case "drop-down":
                    displayTemplate[i].value= this.parseString(displayTemplate[i].value, instance.state_data);
                    break;
                case "radio-button":
                case "check-box":
                    displayTemplate[i].default= this.parseString(displayTemplate[i].value, instance.state_data);
                    break;
                case "image":
                    displayTemplate[i].url= this.parseString(displayTemplate[i].url, instance.state_data);
                    break;
                case "button":
                    displayTemplate[i].label= this.parseString(displayTemplate[i].label, instance.state_data);
                    break;
                case "dial":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    displayTemplate[i].number= this.parseString(displayTemplate[i].number, instance.state_data);
                    break;
                case "calendar":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].start= this.parseString(displayTemplate[i].start, instance.state_data);
                    displayTemplate[i].end= this.parseString(displayTemplate[i].end, instance.state_data);
                    displayTemplate[i].location= this.parseString(displayTemplate[i].location, instance.state_data);
                    displayTemplate[i].notes= this.parseString(displayTemplate[i].notes, instance.state_data);
                    displayTemplate[i].url= this.parseString(displayTemplate[i].url, instance.state_data);
                    break;
                case "map":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].longitude= this.parseString(displayTemplate[i].longitude, instance.state_data);
                    displayTemplate[i].latitude= this.parseString(displayTemplate[i].latitude, instance.state_data);
                    break;
                case "video":
                    displayTemplate[i].label= this.parseString(displayTemplate[i].label, instance.state_data);
                    displayTemplate[i]['video-url']= this.parseString(displayTemplate[i]['video-url'], instance.state_data);
                    break;
                case "multiple-choice":
                    displayTemplate[i].question= this.parseString(displayTemplate[i].question, instance.state_data);
                    displayTemplate[i].answers.forEach(element => {
                        element.option = this.parseString(element.option, instance.state_data);
                        element.value = this.parseString(element.value, instance.state_data);
                    });
                    break;
                case "slider":
                    displayTemplate[i].label= this.parseString(displayTemplate[i].label, instance.state_data);
                    displayTemplate[i].min= this.parseString(displayTemplate[i].min, instance.state_data);
                    displayTemplate[i].max= this.parseString(displayTemplate[i].max, instance.state_data);
                    displayTemplate[i].value= this.parseString(displayTemplate[i].value, instance.state_data);
                    break;
                case "bar-chart":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].bars.forEach(element => {
                        console.log("####### ", element);
                        element.label = this.parseString(element.label, instance.state_data);
                        element.count = this.parseString(element.count, instance.state_data);
                    });
                    break;
                case "pie-chart":
                case "donut-chart":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].slices.forEach(element => {
                        element.label = this.parseString(element.label, instance.state_data);
                        element.count = this.parseString(element.count, instance.state_data);
                    });
                    break;
                case "basic-table":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].header.forEach(header => {
                        for(let element in header) {
                            header[element] = this.parseString(header[element], instance.state_data);
                        };
                    });
                    displayTemplate[i].rows.forEach(row => {
                        for(let field in row) {
                            row[field] = this.parseString(row[field], instance.state_data);
                        };
                    });
                    break;
                case "gauge":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].min= this.parseString(displayTemplate[i].min, instance.state_data);
                    displayTemplate[i].max= this.parseString(displayTemplate[i].max, instance.state_data);
                    displayTemplate[i].value= this.parseString(displayTemplate[i].value, instance.state_data);
                    break;
                case "card":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    break;
                case "timeline":
                    displayTemplate[i].title= this.parseString(displayTemplate[i].title, instance.state_data);
                    displayTemplate[i].entries.forEach(entry => {
                        for(let field in entry) {
                            entry[field] = this.parseString(entry[field], instance.state_data);
                        };
                    });
                    break;
            }
            displayData.displayData.push(displayTemplate[i]);
        }

        return displayData;
    }

    parseString(text: string, data: any) {
        // Split out the string
        const parts = text.split(/[{}]/);
        // check every other string segment looking for a key in data
        // Text for parsing should not start with a variable "{variable} hello!"
        // *** repalce this code with a more comprehensive parser

        for(var i=1;i<parts.length; i+=2) {
            // find this value in the data
            let value = this.findNode(parts[i], data);
            if(value) {
                // if there is a value, replace the entry
                parts[i]=value;
            }
            else {
                // if there is no current value, replace the {field} with blank ""
                parts[i]="";
            }
        }
        // put the string back together again
        return parts.join("");
    }


    findNode(id: string, currentNode: any): any {
        var currentChild: any, result: any;

        if (id in currentNode) {
            return currentNode[id];
        } else {
            // use a for loop instead of forEach to avoid nested functions
            // otherwise "return" will not work properly
            for (var i = 0; currentNode.children !== undefined ; i += 1) {
                currentChild = currentNode.children[i];
    
                // Search in the current child
                result = this.findNode(id, currentChild);
    
                // Return the result if the node has been found
                if (result !== false) {
                    return result;
                }
            }
    
            // the node has not been found and we have no more options
            return false;
        }
    }
}