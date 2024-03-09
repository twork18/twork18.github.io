let addedItems = {};

let similarItems = [];
let filteredItems = []; 
let offsetForPages = [];
let resultFilterIds = [];

let currentPage = 0;
let skipIdsNumber = 0;

let limitValue = 0;
let maxPage = 0;

let currentPageIsTrue = true;
let filterIsTrue = false;

offsetForPages.push(0);

function generateXAuth(password) {
    let timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
    let authString = password + "_" + timestamp;
    return CryptoJS.MD5(authString).toString();
}

function sendRequest(action, params, callback) {
    let password = "Valantis";
    let xAuthValue = generateXAuth(password);

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "http://api.valantis.store:40000/", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-Auth", xAuthValue);
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            let response = JSON.parse(xhr.responseText);
            callback(response);
        } else if (xhr.status === 500) {
            console.error("Server Error 500. Retrying...");
            setTimeout(function() {
                sendRequest(action, params, callback);
            }, 1000);
        } else {
            console.error(xhr.statusText);
        }
    };

    xhr.onerror = function() {
        console.error("Request failed");
    };

    let requestData = {
        "action": action,
        "params": params
    };

    xhr.send(JSON.stringify(requestData));
}

function populateTable(data) {
    let k = 0;
    var tableBody = document.querySelector("#productsTable tbody");
    tableBody.innerHTML = '';
    console.log(data);
    addedItems = {}

    document.getElementById("loadingSpinner").style.display = "none";
    document.querySelector(".pagination").style.display = "block";

    data.forEach(function(item) {
        if (!similarItems[item.id]) {
            if (!addedItems[item.id]) {
                let row = document.createElement("tr");
                if (item.brand === null){
                    row.innerHTML = `
                        <td>${item.id}</td>
                        <td>${item.product}</td>
                        <td>${item.price}</td>
                        <td>${"-"}</td>
                    `;
                    tableBody.appendChild(row);
                } else {
                    row.innerHTML = `
                        <td>${item.id}</td>
                        <td>${item.product}</td>
                        <td>${item.price}</td>
                        <td>${item.brand}</td>
                    `;
                    tableBody.appendChild(row);
                }
                k += 1;
                addedItems[item.id] = true;
    
            } else {
                console.log('fall test');
            }
        }
    });
    tableBody.style.display = "table-row-group";
    console.log(k);
}

function updateTable() {
    if (currentPage === 0){
        document.getElementById("prevPageBtn").style.display = "none";
    } else {
        document.getElementById("prevPageBtn").style.display = "inline-block";
    }
    document.getElementById("loadingSpinner").style.display = "block"; 

    console.log('current', offsetForPages[currentPage]);
    let offsetValue = currentPage * 50 + offsetForPages[currentPage];
    console.log( currentPage, offsetValue);
    sendRequest("get_ids", {offset: offsetValue, limit: 50}, function(response) {
        var result = response.result;
        console.log("hit", result);
        if (result && result.length > 0) {
            skipSimilarIds(result, offsetValue)
        } else {
            console.log("Список идентификаторов товаров пуст");
        }


    });
}

function getItems(currentIds){
    if (currentIds.length < 50) {
        document.getElementById("nextPageBtn").style.display = "none";
    } else {
        document.getElementById("nextPageBtn").style.display = "block";
    }

    sendRequest("get_items", {"ids": currentIds}, function(itemsResponse) {
        var itemsResult = itemsResponse.result;
        populateTable(itemsResult);
    });
}

function skipSimilarIds(mainIds, indent) {
    let resultIds = [];
    let limitValueInFunc = 0; 

    if (currentPage === 0) {
        similarItems = [];
    }

    for (let i = 0; i < mainIds.length; i++) {
        if (resultIds.includes(mainIds[i]) ) {
            console.log('ид уже был');

            if (currentPage >= maxPage) {
                limitValue += 1;
            }

            limitValueInFunc += 1;
            similarItems.push(mainIds[i]);
        } else if (currentPageIsTrue === true && similarItems.includes(mainIds[i]) && currentPage > maxPage) {
            console.log('этот ид был на предыдущих страницах');
            limitValue += 1;
            limitValueInFunc += 1;
        } else {
            console.log('its new')
            resultIds.push(mainIds[i]);
        }
    }

    if (currentPageIsTrue === true && !offsetForPages[currentPage + 1]) {
        offsetForPages.push(limitValue);
    }

    if (limitValueInFunc > 0) {
        sendRequest("get_ids", {offset: (indent + 50), limit: limitValueInFunc}, function(response) {
            response.result.forEach(function(item) {
                resultIds.push(item)
            });
            console.log('hit 2', resultIds);
            getItems(resultIds);
        });
    } else {
        console.log('not find');
        getItems(mainIds);
    }
    
}

function filterUpdate(params) {

    sendRequest("filter", params, function(response) {
        console.log('filter', response.result)
        filteredItems = response.result; 
        currentPage = 0; 
        skipSimilarIdsFilter(filteredItems); 
    });
}

function skipSimilarIdsFilter(mainIds) {
    resultFilterIds = []
    for (let i = 0; i < mainIds.length; i++) {
        if (resultFilterIds.includes(mainIds[i]) ) {
            console.log('ид уже был');
        } else {
            console.log('its new')
            resultFilterIds.push(mainIds[i]);
        }
    }

    updateTableFilter(resultFilterIds);
}

function updateTableFilter(filterIds) {
    if (currentPage === 0){
        document.getElementById("prevPageBtn").style.display = "none";
    } else {
        document.getElementById("prevPageBtn").style.display = "inline-block";
    }
    document.getElementById("loadingSpinner").style.display = "block"; 

    let offset = currentPage * 50;
    let currentPageItems = filterIds.slice(offset, offset + 50); 
    getItems(currentPageItems);
}

function applyFilter() {
    let price = document.getElementById("priceFilter").value;
    let brand = document.getElementById("brandFilter").value;
    let name = document.getElementById("nameFilter").value;
    document.getElementById("tableBody").style.display = "none";
    document.getElementById("loadingSpinner").style.display = "block"; 
    document.querySelector(".pagination").style.display = "none";
    

    let params = {};
    if (price) {
        params.price = parseFloat(price); 
    }
    if (brand) {
        params.brand = brand;
    }
    if (name) {
        params.product = name;
    }
    console.log(params);

    currentPage = 0;
    maxPage = 0;
    currentPageIsTrue = true;
    similarItems = [];
    offsetForPages = [0];
    limitValue = 0;

    if (params == {}) {
        filterIsTrue = false;
        updateTable();
    } else {
        filterIsTrue = true;
        filterUpdate(params);
    }
}

function nextPage() {
    document.getElementById("tableBody").style.display = "none";
    document.querySelector(".pagination").style.display = "none";

    maxPage += 1;
    currentPage++;
    currentPageIsTrue = true;
    
    if (filterIsTrue === true) {
        updateTableFilter(resultFilterIds);
    } else {
        updateTable();
    }
}

function prevPage() {
    if (currentPage > 0) {
        document.getElementById("tableBody").style.display = "none";
        document.querySelector(".pagination").style.display = "none";
        
        currentPage--;
        currentPageIsTrue = false

        if (filterIsTrue === true) {
            updateTableFilter(resultFilterIds);
        } else {
            updateTable();
        }
    }
}

document.getElementById("nextPageBtn").addEventListener("click", nextPage);
document.getElementById("prevPageBtn").addEventListener("click", prevPage);

updateTable();