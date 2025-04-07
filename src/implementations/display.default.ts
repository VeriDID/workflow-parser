import { DisplayData, IDisplay } from "../interfaces/displayinterface";
import { Instance, Workflow } from "../interfaces/workflowinterface";

export class DefaultDisplay implements IDisplay {

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
            
            switch(displayTemplate[i].type) {
                case "text":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    break;
                case "control":
                    displayTemplate[i].text= this.parseString(displayTemplate[i].text, instance.state_data);
                    break;
            }
            displayData.displayData[i]=displayTemplate[i];
        }

        return displayData;
    }

    parseString(text: string, data: any) {
        // Split out the string
        const parts = text.split(/[{,}]/);
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