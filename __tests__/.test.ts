   // __tests__/my-module.test.ts
import { WorkflowParser } from '../src/workflowparser';
import { DefaultDisplay } from '../src/implementations/display.default';
import { DefaultAction } from '../src/implementations/action.default';
import { DefaultWorkflow } from '../src/implementations/workflow.default';
import { Client } from 'pg';
import * as testWorkflows from './testworkflows.json'
import { ExtendedAction } from './action.extension';
import { ExtendedDisplay } from './display.extension';

const client = {
    user: 'admin',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'test_workflows'
}

const defaultWorkflow = new DefaultWorkflow(client);

const actionExtension = new ExtendedAction();

const defaultAction = new DefaultAction(actionExtension);

const displayExtenion = new ExtendedDisplay();

const defaultDisplay = new DefaultDisplay(displayExtenion);

const testParser = new WorkflowParser(defaultDisplay, defaultAction, defaultWorkflow);

async function setupForTesting() {
    const testClient = new Client(client);
    console.log("Connect to database");
    await connectDatabase(testClient);
    
    console.log("Drop workflows table");
    await dropTable(testClient, "workflows");
    console.log("Drop instances table");
    await dropTable(testClient, "instances");
    
    console.log("Add workflows table");
    await addTable(testClient, 
        `CREATE TABLE workflows (
            workflow_id VARCHAR(255) PRIMARY KEY, 
            name VARCHAR(255),
            initial_state VARCHAR(255),
            render JSONB,
            states JSONB
        );`
    )
    
    console.log("Add instances table");
    await addTable(testClient, 
        `CREATE TABLE instances (
            instance_id UUID PRIMARY KEY,
            workflow_id VARCHAR(255),
            client_id VARCHAR(255), 
            current_state VARCHAR(255),
            state_data JSONB
        );`
    );
    
    console.log("Insert workflows");
    await insertWorkflows(testClient);

    console.log("Disconnect database");
    await disconnectDatabase(testClient);
}


async function connectDatabase(dbClient: Client): Promise<void>{
    await dbClient.connect();
}
async function disconnectDatabase(dbClient: Client): Promise<void>{
    await dbClient.end();
}


async function dropTable(dbClient: Client, table: string): Promise<void> {
    try {
        console.log("*** Drop Table - ", table);
        const result = await dbClient.query('DROP TABLE IF EXISTS ' + table + ';');
    }
    catch(error) {
        console.log("Drop workflows error=", error);
    }
}

async function addTable(dbClient: Client, tableSql: string): Promise<void> {
    try {
        console.log("*** Create Tables");
        const result = await dbClient.query(tableSql);
    }
    catch(error) {
        console.log("Drop table error=", error);
    }
}

async function insertWorkflows(dbClient: Client): Promise<void> {
    console.log("*** Insert Workflows");
    const query = 'INSERT INTO workflows (workflow_id, name, initial_state, render, states) VALUES ($1, $2, $3, $4, $5)';
    for (const workflow of testWorkflows.workflows) {
      console.log("Inserting workflow:", workflow);
      console.log("Inserting workflowID:", workflow.workflow_id);
      await dbClient.query(query, [
        workflow.workflow_id,
        workflow.name,
        workflow.initial_state,
        JSON.stringify(workflow.render),
        JSON.stringify(workflow.states)
      ]);
    } 
}

async function setup(): Promise<void> {
    await setupForTesting();
    console.log("=== Completed setup");
}


it('Get the default state from the workflow', async () => {
    await setup();
    console.log("*** Start test");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "", data: {} });    
    expect(display).toStrictEqual({"displayData": [{"type": "image", "url": "http://image.com/image.png"}, {"display": "title", "text": "This is the test for workflow", "type": "text"}, {"condition": "instance?.state_data?.first==undefined", "text": "First time showing this page", "type": "text"}, {"action_id": "nextButton", "label": "Next button", "type": "button"}, {"action_id": "dataButton", "label": "Data button", "type": "button"}, {"action_id": "workflowButton", "label": "Workflow button", "type": "button"}], "workflowID": "root-menu"});
});

it('Got to page1', async () => {
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "nextButton", data: {} });
    expect(display).toStrictEqual({"displayData": [{"type": "text", "text": "This is the page for testing state transitions."}, {"type": "button", "label": "Go back", "action_id": "backButton"}], "workflowID": "root-menu"});
});

it('return from Page1 to menu', async () => {
    console.log("~~~ Start Test 3 - return from Page1 to menu");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "backButton", data: {} });
    expect(display).toStrictEqual({"displayData": [{"type": "image", "url": "http://image.com/image.png"}, {"display": "title", "text": "This is the test for workflow", "type": "text"}, {"action_id": "nextButton", "label": "Next button", "type": "button"}, {"action_id": "dataButton", "label": "Data button", "type": "button"}, {"action_id": "workflowButton", "label": "Workflow button", "type": "button"}], "workflowID": "root-menu"});
});

it('go to page 2', async () => {
    console.log("~~~ Start Test 4 - go to page 2");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "dataButton", data: {} });
    expect(display).toStrictEqual({"displayData": [{
                            "type": "text",
                            "display": "title",
                            "text": "This is the page for testing data."
                        },
                        {
                            "type": "extended",
                            "text": "Extended display render!!"
                        },
                        {
                            "type": "button",
                            "label": "Save Data",
                            "action_id": "saveButton"
                        },
                        {
                            "type": "button",
                            "label": "State Data",
                            "action_id": "stateButton"
                        },
                        {
                            "type": "button",
                            "label": "Extension",
                            "action_id": "extensionButton"
                        },
                        {
                            "answers": [
                                {
                                "option": "a.  to get to the other side",
                                "value": "A",
                                },
                                {
                                "option": "",
                                "value": "B",
                                },
                                {
                                "option": "c. better view of the mountains",
                                "value": "",
                                },
                            ],
                            "form": "Test Form",
                            "form-id": "question",
                            "question": "This is the question title ",
                            "type": "multiple-choice",
                        },
                        {
                            "type": "bar-chart",
                            "title": "Lunch survey results ",
                            "bars": [
                                {"label": "", "count": "" },
                                {"label": "French cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": "72"}
                            ]
                        },
                        {
                            "type": "donut-chart",
                            "title": "Lunch survey  results",
                            "slices": [
                                {"label": "Chicken restaurant", "count": "53"},
                                {"label": " cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": ""}
                            ]
                        },
                        {
                            "type": "basic-table",
                            "title": "Menu ",
                            "border": true,
                            "header": [
                                {"column1": "Name ", "order": "1" },
                                {"column1": "Description", "order": "2" },
                                {"column1": "Price", "order": "3" }
                            ],
                            "rows": [
                                {"column1": "Salad", "column2": "Lettuce and tomato", "column3": "$5.99"},
                                {"column1": "Meat ", "column2": "Ham ", "column3": "$15.99"},
                                {"column1": "Cake", "column2": "Chocolate", "column3": ""}
                            ]
                        },  
                        {
                            "type": "gauge",
                            "title": "Progress ",
                            "value": "",
                            "min": "",
                            "max": ""
                        },
                        {
                            "type": "card",
                            "title": "Special ",
                            "text": "This is the text that appears in a card ."
                        },
                        {
                            "type": "timeline",
                            "title": "Roadmap to the  future",
                            "entries": [
                                {"order": "1", "entry": "Day 1  ", "text": "Write a  list"},
                                {"order": "2", "entry": "", "text": ""},
                                {"order": "3", "entry": "Year 2", "text": "Check off the tasks"},
                                {"order": "4", "entry": "Year 3", "text": "Bask in glory"}
                            ]
                        },                                                                                              
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field one",
                            "value": "",
                            "form-id": "save-field"
                        },                        
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field two",
                            "value": "",
                            "form-id": "save-field2"
                        },                        
                        {
                            "type": "button",
                            "label": "Go back",
                            "action_id": "backButton"
                        }
], "workflowID": "root-menu"});
});

it('save fixed data', async () => {
    console.log("~~~ Start Test 5 - save fixed data");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "saveButton", data: {"save-field": "Hello"} });
    expect(display).toStrictEqual({"displayData": [{
                            "type": "text",
                            "display": "title",
                            "text": "This is the page for testing data."
                        },
                        {
                            "type": "extended",
                            "text": "Extended display render!!"
                        },
                        {
                            "type": "button",
                            "label": "Save Data",
                            "action_id": "saveButton"
                        },
                        {
                            "type": "button",
                            "label": "State Data",
                            "action_id": "stateButton"
                        },
                        {
                            "type": "button",
                            "label": "Extension",
                            "action_id": "extensionButton"
                        },
                        {
                            "answers": [
                                {
                                "option": "a.  to get to the other side",
                                "value": "A",
                                },
                                {
                                "option": "",
                                "value": "B",
                                },
                                {
                                "option": "c. better view of the mountains",
                                "value": "",
                                },
                            ],
                            "form": "Test Form",
                            "form-id": "question",
                            "question": "This is the question title ",
                            "type": "multiple-choice",
                        },
                        {
                            "type": "bar-chart",
                            "title": "Lunch survey results ",
                            "bars": [
                                {"label": "", "count": "" },
                                {"label": "French cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": "72"}
                            ]
                        },
                        {
                            "type": "donut-chart",
                            "title": "Lunch survey  results",
                            "slices": [
                                {"label": "Chicken restaurant", "count": "53"},
                                {"label": " cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": ""}
                            ]
                        },
                        {
                            "type": "basic-table",
                            "title": "Menu ",
                            "border": true,
                            "header": [
                                {"column1": "Name ", "order": "1" },
                                {"column1": "Description", "order": "2" },
                                {"column1": "Price", "order": "3" }
                            ],
                            "rows": [
                                {"column1": "Salad", "column2": "Lettuce and tomato", "column3": "$5.99"},
                                {"column1": "Meat ", "column2": "Ham ", "column3": "$15.99"},
                                {"column1": "Cake", "column2": "Chocolate", "column3": ""}
                            ]
                        },
                        {
                            "type": "gauge",
                            "title": "Progress ",
                            "value": "",
                            "min": "",
                            "max": ""
                        },                                                                        
                        {
                            "type": "card",
                            "title": "Special ",
                            "text": "This is the text that appears in a card ."
                        },
                        {
                            "type": "timeline",
                            "title": "Roadmap to the  future",
                            "entries": [
                                {"order": "1", "entry": "Day 1  ", "text": "Write a  list"},
                                {"order": "2", "entry": "", "text": ""},
                                {"order": "3", "entry": "Year 2", "text": "Check off the tasks"},
                                {"order": "4", "entry": "Year 3", "text": "Bask in glory"}
                            ]
                        },                        
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field one",
                            "value": "",
                            "form-id": "save-field"
                        },                        
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field two",
                            "value": "",
                            "form-id": "save-field2"
                        },                        
                        {
                            "type": "button",
                            "label": "Go back",
                            "action_id": "backButton"
                        }
    ], "workflowID": "root-menu"});
});

it('save mobile data', async () => {
    console.log("~~~ Start Test 6 - save mobile data");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "stateButton", data: {"Date": "Today", "Test": "This is test data"} });
    expect(display).toStrictEqual({"displayData": [{
                            "type": "text",
                            "display": "title",
                            "text": "This is the page for testing data."
                        },
                        {
                            "type": "text",
                            "text": "Date=Today",
                            "condition": "instance?.state_data?.Date!=undefined"
                        },                        
                        {
                            "type": "extended",
                            "text": "Extended display render!!"
                        },
                        {
                            "type": "button",
                            "label": "Save Data",
                            "action_id": "saveButton"
                        },
                        {
                            "type": "button",
                            "label": "State Data",
                            "action_id": "stateButton"
                        },
                        {
                            "type": "button",
                            "label": "Extension",
                            "action_id": "extensionButton"
                        },
                        {
                            "answers": [
                                {
                                "option": "a. Today to get to the other side",
                                "value": "A",
                                },
                                {
                                "option": "Today",
                                "value": "B",
                                },
                                {
                                "option": "c. better view of the mountains",
                                "value": "Today",
                                },
                            ],
                            "form": "Test Form",
                            "form-id": "question",
                            "question": "This is the question title Today",
                            "type": "multiple-choice",
                        },
                        {
                            "type": "bar-chart",
                            "title": "Lunch survey results Today",
                            "bars": [
                                {"label": "Today", "count": "Today" },
                                {"label": "French cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": "72"}
                            ]
                        },
                        {
                            "type": "donut-chart",
                            "title": "Lunch survey Today results",
                            "slices": [
                                {"label": "Chicken restaurant", "count": "53"},
                                {"label": "Today cafe", "count": "14"},
                                {"label": "Pizza parlour", "count": "Today"}
                            ]
                        },
                        {
                            "type": "basic-table",
                            "title": "Menu Today",
                            "border": true,
                            "header": [
                                {"column1": "Name Today", "order": "1" },
                                {"column1": "Description", "order": "2" },
                                {"column1": "Price", "order": "3" }
                            ],
                            "rows": [
                                {"column1": "Salad", "column2": "Lettuce and tomato", "column3": "$5.99"},
                                {"column1": "Meat Today", "column2": "Ham Today", "column3": "$15.99"},
                                {"column1": "Cake", "column2": "Chocolate", "column3": "Today"}
                            ]
                        },                                                
                        {
                            "type": "gauge",
                            "title": "Progress Today",
                            "value": "Today",
                            "min": "Today",
                            "max": "Today"
                        },
                        {
                            "type": "card",
                            "title": "Special Today",
                            "text": "This is the text that appears in a card Today."
                        },
                        {
                            "type": "timeline",
                            "title": "Roadmap to the Today future",
                            "entries": [
                                {"order": "1", "entry": "Day 1 Today ", "text": "Write a Today list"},
                                {"order": "2", "entry": "Today", "text": "Today"},
                                {"order": "3", "entry": "Year 2", "text": "Check off the tasks"},
                                {"order": "4", "entry": "Year 3", "text": "Bask in glory"}
                            ]
                        },                       
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field one",
                            "value": "",
                            "form-id": "save-field"
                        },                        
                        {
                            "form": "Save Form",
                            "type": "text-field",
                            "label": "Field two",
                            "value": "Today",
                            "form-id": "save-field2"
                        },                        
                        {
                            "type": "button",
                            "label": "Go back",
                            "action_id": "backButton"
                        }
    ], "workflowID": "root-menu"});
});

it('return to menu', async () => {
    console.log("~~~ Start Test 7 - return to menu");
    const display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "backButton", data: {} });
    expect(display).toStrictEqual({"displayData": [{"type": "image", "url": "http://image.com/image.png"}, {"display": "title", "text": "This is the test for workflow", "type": "text"}, {"action_id": "nextButton", "label": "Next button", "type": "button"}, {"action_id": "dataButton", "label": "Data button", "type": "button"}, {"action_id": "workflowButton", "label": "Workflow button", "type": "button"}], "workflowID": "root-menu"});
});

/*
async function runtests(): Promise<void> {
   

    console.log("~~~ Start Test 1 - Load default workflow and state");
    let display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 2 - go to Page1");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "nextButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 3 - return from Page1 to menu");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "backButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 4 - go to page 2");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "dataButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 5 - save fixed data");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "saveButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 6 - save mobile data");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "stateButton", data: {"Date": "Today"} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 7 - return to menu");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "backButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 8 - go to new workflow");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "workflowButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 9 - go back to root-menu workflow");
    display = await testParser.parse("TestPersonID", {workflowID: "other-menu", actionID: "homeButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 10 - go to new workflow");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "workflowButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 11 - return to root-menu workflow");
    display = await testParser.parse("TestPersonID", {workflowID: "other-menu", actionID: "noactionButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 12 - go to page 2");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "dataButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 13 - extension test");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "extensionButton", data: {} });
    console.log("Returns displaydata= %j", display);

    console.log("~~~ Start Test 14 - return to menu");
    display = await testParser.parse("TestPersonID", {workflowID: "root-menu", actionID: "backButton", data: {} });
    console.log("Returns displaydata= %j", display);
}
*/