var settings = {
  buttons: []
};
var operationHistory = [];
var currentIndex = -1;
var fileInput;
var fileMessages = {}; 
function toggleSettings() {
  var settingsContainer = document.getElementById("settingsContainer");
  if (settingsContainer.style.display === "none") {
    settingsContainer.style.display = "block";
  } else {
    settingsContainer.style.display = "none";
  }
}

function createButton() {
  var userInput = document.getElementById("userInput").value;
  var addSpace = document.getElementById("addSpace").checked;
  if (userInput.trim()!== "") {
    var newButton = document.createElement("button");
    newButton.innerText = userInput + (addSpace? " -" : "");
    newButton.onclick = function () {
      var largeInput = document.getElementById("largeInput");
      var valueToAdd = this.innerText.replace(" -", "") + (addSpace? " " : "");
      largeInput.value += valueToAdd;
      operationHistory.push(largeInput.value);
      currentIndex++;
      updateDisplay(largeInput);
    };
    var buttonSettings = settings.buttons.find(button => button.text === userInput);
    if (buttonSettings && buttonSettings.size) {
      newButton.style.width = buttonSettings.size.width;
      newButton.style.height = buttonSettings.size.height;
    } else {
      newButton.style.width = "80px";
      newButton.style.height = "30px";
    }
    if (buttonSettings && buttonSettings.color) {
      newButton.style.border = `1px solid ${buttonSettings.color.border}`;
      newButton.style.backgroundColor = buttonSettings.color.background;
    } else {
      newButton.style.border = "0.85px solid #ccc";
      newButton.style.backgroundColor = "#f0f0f0";
    }
    document.getElementById("buttonContainer").appendChild(newButton);
    settings.buttons.push({
      text: userInput,
      addSpace: addSpace,
      size: buttonSettings? buttonSettings.size : { width: "80px", height: "30px" },
      color: buttonSettings? buttonSettings.color : { border: "#ccc", background: "#f0f0f0" },
      type: "normal"
    });
    document.getElementById("userInput").value = "";
  } else {
    alert("请输入文本以创建按钮");
  }
}

function deleteLastButton() {
  var buttonContainer = document.getElementById("buttonContainer");
  var lastButton = buttonContainer.lastChild;
  if (lastButton) {
    buttonContainer.removeChild(lastButton);
    settings.buttons.pop();
  } else {
    alert("没有按钮可以删除");
  }
}

function updateDisplay(textarea) {
  var value = textarea.value;
  var tempElement = document.createElement('textarea');
  tempElement.value = value;
  tempElement.value = tempElement.value.replace(/\n/g, '↙').replace(/ /g, '‥');
  textarea.value = tempElement.value;
  showCharacterCount(textarea);
}

function onTextareaBlur(event) {
  var textarea = event.target;
  textarea.value = textarea.value.replace(/\↙/g, '\n').replace(/‥/g, ' ');
  showCharacterCount(textarea);
}

function downloadFile() {
  var filename = document.getElementById("filename").value;
  var fileFormat = document.getElementById("fileFormat").value;
  var content = document.getElementById("largeInput").value.replace(/\↙/g, '\n').replace(/‥/g, ' ');
  var encrypt = document.getElementById("encryptDownloadCheckbox").checked;
  if (encrypt) {
    content = encryptDownloadContent(content);
  }
  var blob = new Blob([content], {
    type: "text/plain"
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename + fileFormat;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showSaveSettings() {
  var saveSettingsContainer = document.getElementById("saveSettingsContainer");
  if (saveSettingsContainer.style.display === "none") {
    saveSettingsContainer.style.display = "block";
  } else {
    saveSettingsContainer.style.display = "none";
  }
}

function saveSettings() {
  var filename = document.getElementById("settingsFilename").value;
  if (filename.trim() === "") {
    alert("请输入配置文件名");
    return;
  }
  var password = document.getElementById("passwordInput").value;
  var encrypt = document.getElementById("encryptCheckbox").checked;
  var passwordObj = password? { password: password } : {};
  var filteredButtons = settings.buttons.filter(button => button.type === "normal").map(button => {
    return {
      text: button.text,
      addSpace: button.addSpace,
      type: button.type
    };
  });
  var content = {
    settings: {
      buttons: filteredButtons
    },
   ...passwordObj
  };
  if (encrypt) {
    content = encryptContent(JSON.stringify(content));
  } else {
    content = JSON.stringify(content);
  }
  var blob = new Blob([content], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  document.getElementById("settingsFilename").value = "";
  document.getElementById("passwordInput").value = "";
}
function loadSettings(format = true) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.onchange = function (event) {
        var files = event.target.files;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var fileExtension = file.name.split('.').pop().toLowerCase();
            var passwordTries = 0;
            if (fileExtension === 'json') {
                loadJsonFile(file, format);
            } else if (fileExtension === 'zip') {
                handleZipFile(file, format);
            } else {
                // 先尝试以zip格式加载
                handleZipFile(file, format).catch(() => {
                    // 如果zip加载失败，再尝试以json格式加载
                    loadJsonFile(file, format);
                });
            }
        }
    };
    fileInput.click();
}
function loadJsonFile(file, format) {
    var reader = new FileReader();
    reader.onload = function (e) {
        var fileContent = e.target.result;
        try {
            var loadedData = JSON.parse(fileContent);
            var password = loadedData.password;
            if (password) {
                var userPassword = prompt("请输入密码");
                while (userPassword!== password && passwordTries < 3) {
                    userPassword = prompt("密码错误，请重新输入密码");
                    passwordTries++;
                }
                if (userPassword!== password) {
                    alert("密码错误次数过多，取消加载文件");
                    return;
                }
            }
            if (format) {
                loadedData = formatData(loadedData);
            }
            var newSettings = loadedData.settings;
            newSettings.buttons.forEach(function (buttonSetting) {
                createButtonFromSetting(buttonSetting, document.getElementById("buttonContainer"));
            });
            var loadedFilesList = document.getElementById("loadedFilesList");
            var li = document.createElement("li");
            li.textContent = (loadedFilesList.children.length + 1) + ". " + file.name;
            loadedFilesList.appendChild(li);
            if (loadedData.message) {
                fileMessages[file.name] = loadedData.message;
                if (loadedData.tippop) {
                    alert(loadedData.message);
                }
            }
        } catch (error) {
            alert("加载文件失败，不是有效的JSON文件");
        }
    };
    reader.readAsText(file);
}
function createButtonFromText(buttonText, addSpace) {
  var newButton = document.createElement("button");
  newButton.innerText = buttonText + (addSpace? " -" : "");
  newButton.onclick = function () {
    var largeInput = document.getElementById("largeInput");
    var valueToAdd = this.innerText.replace(" -", "") + (addSpace? " " : "");
    largeInput.value += valueToAdd;
    operationHistory.push(largeInput.value);
    currentIndex++;
    updateDisplay(largeInput);
  };
  document.getElementById("buttonContainer").appendChild(newButton);
}

function undo() {
  if (currentIndex > 0) {
    currentIndex--;
    document.getElementById('largeInput').value = operationHistory[currentIndex];
    updateDisplay(document.getElementById('largeInput'));
  }
}

function clearText() {
  document.getElementById('largeInput').value = "";
  operationHistory.push("");
  currentIndex++;
}

function addNewline() {
  var largeInput = document.getElementById('largeInput');
  var start = largeInput.selectionStart;
  var end = largeInput.selectionEnd;
  var value = largeInput.value;
  largeInput.value = value.substring(0, start) + '↙' + value.substring(end);
  largeInput.selectionStart = largeInput.selectionEnd = start + 1;
  operationHistory.push(largeInput.value);
  currentIndex++;
  updateDisplay(largeInput);
}

function showCharacterCount(textarea) {
  var count = textarea.value.length;
  var countDiv = textarea.parentNode.querySelector('.character-count');
  if (countDiv) {
    countDiv.textContent = count + "个字符";
  } else {
    countDiv = document.createElement('div');
    countDiv.textContent = count + "个字符";
    countDiv.classList.add('character-count');
    countDiv.style.position = 'absolute';
    countDiv.style.bottom = '5px';
    countDiv.style.right = '5px';
    countDiv.style.fontSize = '10px';
    countDiv.style.color = '#888';
    countDiv.style.whiteSpace = 'nowrap';
    var scrollTop = textarea.scrollTop;
    countDiv.style.transform = `translateY(${scrollTop}px)`;
    textarea.parentNode.appendChild(countDiv);
  }
}

function isFileLoaded(filename) {
  var loadedFilesList = document.getElementById("loadedFilesList");
  for (var i = 0; i < loadedFilesList.children.length; i++) {
    if (loadedFilesList.children[i].textContent.includes(filename)) {
      return true;
    }
  }
  return false;
}

function encryptContent(content) {
  var key = "secretkey";
  var encrypted = "";
  for (var i = 0; i < content.length; i++) {
    encrypted += String.fromCharCode(content.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return encrypted;
}

function decryptContent(encryptedContent) {
  var key = "secretkey";
  var decrypted = "";
  for (var i = 0; i < encryptedContent.length; i++) {
    decrypted += String.fromCharCode(encryptedContent.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return decrypted;
}

function encryptDownloadContent(content) {
  var encrypted = "";
  for (var i = 0; i < content.length; i++) {
    var charCode = content.charCodeAt(i);
    encrypted += String.fromCharCode((charCode + 5) % 256);
  }
  return encrypted;
}
function handleZipFile(zipFile, format = true) {
    var reader = new FileReader();
    reader.onload = function (e) {
        var data = new Uint8Array(e.target.result);
        JSZip.loadAsync(data).then(function (zip) {
            var combinedMessage = "";
            zip.forEach(function (relativePath, file) {
                file.async('string').then(function (content) {
                    try {
                        var loadedData = JSON.parse(content);
                        var password = loadedData.password;
                        if (password) {
                            var userPassword = prompt("请输入配置文件密码：");
                            if (userPassword!== password) {
                                alert("密码错误，无法加载配置文件。");
                                return;
                            }
                        }
                        if (format) {
                            loadedData = formatData(loadedData);
                        }
                        var newSettings = loadedData.settings;
                        newSettings.buttons.forEach(function (buttonSetting) {
                            createButtonFromSetting(buttonSetting, document.getElementById("buttonContainer"));
                        });
                        var loadedFilesList = document.getElementById("loadedFilesList");
                        var li = document.createElement("li");
                        li.textContent = (loadedFilesList.children.length + 1) + ". " + zipFile.name;
                        loadedFilesList.appendChild(li);
                        if (loadedData.message) {
                            combinedMessage += `${file.name}: ${loadedData.message}\n`;
                        }
                    } catch (error) {
                        alert("文件内容不是有效的JSON格式，无法加载配置文件。");
                    }
                });
            });
            document.getElementById('loadedFilesList').addEventListener('click', function (e) {
                if (e.target.tagName === 'LI' && e.target.textContent.includes(zipFile.name)) {
                    alert(combinedMessage);
                }
            });
        }).catch(function (error) {
            // 在这里添加尝试以json格式加载的逻辑
            loadJsonFile(zipFile, format);
            alert("解压文件出错：" + error);
        });
    };
    reader.readAsArrayBuffer(zipFile);
}
function createBigButton(bigButtonSetting, parentContainer) {
  var newBigButton = document.createElement("button");
  newBigButton.innerText = bigButtonSetting.text;
  newBigButton.classList.add("big-button");
  newBigButton.onclick = function () {
    this.classList.toggle("collapsed");
    var subButtons = this.nextElementSibling;
    if (subButtons) {
      subButtons.style.display = this.classList.contains("collapsed")? "none" : "flex";
    }
    this.classList.toggle("big-button-expanded");
  };
  newBigButton.style.width = bigButtonSetting.size?.width || "150px";
  newBigButton.style.height = bigButtonSetting.size?.height || "32px";
  newBigButton.style.border = `1px solid ${bigButtonSetting.color?.border || "#ccc"}`;
  newBigButton.style.backgroundColor = bigButtonSetting.color?.background || "#ccc";
  if (!parentContainer) {
    parentContainer = document.getElementById("buttonContainer");
  }
  parentContainer.appendChild(newBigButton);
  var subButtonsContainer = document.createElement("div");
  subButtonsContainer.classList.add("sub-buttons-container");
  subButtonsContainer.style.display = "flex";
  subButtonsContainer.style.flexWrap = "wrap";
  subButtonsContainer.style.width = "100%";
  subButtonsContainer.style.marginTop = "2px";
  if (bigButtonSetting.collapsed) {
    subButtonsContainer.style.display = "none";
  }
  bigButtonSetting.subButtons.forEach(function (subButtonSetting) {
    if (!subButtonSetting.type) {
      subButtonSetting.type = "small";
    }
    // 根据按钮组层级正确传递globalsize2
    if (bigButtonSetting.type === "big" && bigButtonSetting.globalsize2) {
      subButtonSetting.globalsize2 = bigButtonSetting.globalsize2;
    }
    subButtonSetting.globalcolor2 = bigButtonSetting.globalcolor2;
    subButtonSetting.globalcolor = bigButtonSetting.globalcolor;
    subButtonSetting.globalsize = bigButtonSetting.globalsize;
    createButtonFromSetting(subButtonSetting, subButtonsContainer);
  });
  parentContainer.appendChild(subButtonsContainer);
}

function createSmallButton(smallButtonSetting, parentContainer) {
  var newSmallButton = document.createElement("button");
  newSmallButton.innerText = smallButtonSetting.text + (smallButtonSetting.addSpace? " -" : "");
  newSmallButton.onclick = function () {
    var largeInput = document.getElementById("largeInput");
    var valueToAdd = this.innerText.replace(" -", "") + (smallButtonSetting.addSpace? " " : "");
    largeInput.value += valueToAdd;
    operationHistory.push(largeInput.value);
    currentIndex++;
    updateDisplay(largeInput);
  };
  newSmallButton.style.width = smallButtonSetting.size?.width || smallButtonSetting.globalsize2?.width || smallButtonSetting.globalsize?.width || "80px";
  newSmallButton.style.height = smallButtonSetting.size?.height || smallButtonSetting.globalsize2?.height || smallButtonSetting.globalsize?.height || "30px";
  newSmallButton.style.border = `1px solid ${smallButtonSetting.color?.border || smallButtonSetting.globalcolor2?.border || smallButtonSetting.globalcolor?.border || "#ccc"}`;
  newSmallButton.style.backgroundColor = smallButtonSetting.color?.background || smallButtonSetting.globalcolor2?.background || smallButtonSetting.globalcolor?.background || "#f0f0f0";
  newSmallButton.classList.add("small-button");
  if (parentContainer) {
    parentContainer.appendChild(newSmallButton);
  } else {
    document.getElementById("buttonContainer").appendChild(newSmallButton);
  }
}
function createButtonFromSetting(buttonSetting, parentContainer) {
   if (buttonSetting.type === "big") {
     createBigButton(buttonSetting, parentContainer);
   } else if (buttonSetting.type === "normal" || buttonSetting.type === "small") {
     createSmallButton(buttonSetting, parentContainer);
   } else { 
     buttonSetting.type = "normal"; 
     createSmallButton(buttonSetting, parentContainer);
   }
 }
function formatData(data) {
  data.settings.buttons.forEach(button => {
    button.text = button.text.replace(/ /g, '‥');
  });
  return data;
}
function getMessageByFilename(filename) {
   return fileMessages[filename];
 }
 document.getElementById('loadedFilesList').addEventListener('click', function (e) {
   if (e.target.tagName === 'LI') {
     const filename = e.target.textContent.split('. ')[1];
     const message = getMessageByFilename(filename);
     if (message) {
       alert(message);
     }
   }
 });
function toggleSaveOptions() {
  var saveOptionsContainer = document.getElementById("saveOptionsContainer");
  if (saveOptionsContainer.style.display === "none") {
    saveOptionsContainer.style.display = "block";
  } else {
    saveOptionsContainer.style.display = "none";
  }
}