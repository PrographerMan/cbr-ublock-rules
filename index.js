

const http = require('https');
const fs = require('fs');
const xlsx = require('node-xlsx');

const currentDate = new Date();
const fileHeader =
'! Title: Suspicious sites and web pages companies of Russia\n' +
'! Description: Filters of suspicious companies recognized by the Bank of Russia.\n' +
'! Expires: 1 day\n' +
'! Last modified: ' + currentDate.toLocaleDateString('en-US').toString() + '\n\n';
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const currentDay = currentDate.getDate();
const dateAsParameter = `${currentMonth}/${currentDay}/${currentYear}`;
const outputFileName = 'file.xlsx';
const outputRulesFileName = 'filters.txt';
const searchParams = [
  {
    name: 'FromDate',
    value: dateAsParameter
  },
  {
    name: 'ToDate',
    value: dateAsParameter
  },
  {
    name: 'posted',
    value: false
  }
];
const downloadableFileURL = new URL('https://cbr.ru/Queries/UniDbQuery/DownloadExcel/123126');
searchParams.forEach((param) => {
  downloadableFileURL.searchParams.append(param.name, param.value);
});
const readyUrl = downloadableFileURL.toString();
const file = fs.createWriteStream(outputFileName);

class BlockRule {
  static addressBeginning = '||';
  static separator = '^';
  static defaultProtocol = 'https://';

  constructor(url) {
    if (!url) return;

    let address;

    try {
      address = new URL(url);
    } catch (error) {
      try {
        address = new URL(`${BlockRule.defaultProtocol}${url}`);
      } catch (error) {
        return;
      }
    }

    this.hasSeparator = true;
    
    if (address.pathname !== '/') {
      this.pathname = address.pathname;
      this.hasSeparator = false;
    }
    
    this.verbatim = address.hostname;
  }

  toString() {
    const separator = this.hasSeparator ? BlockRule.separator : '';
    const pathname = this.pathname ? this.pathname : '';
    return `${BlockRule.addressBeginning}${this.verbatim}${separator}${pathname}`;
  }
}


http.get(readyUrl, function (response) {
  response.pipe(file);

  file.on("finish", () => {
    file.close();

    const columnNumber = 4;
    let rules = [];
    let i = 1;
    const worksheet = xlsx.parse(`${__dirname}/${file.path}`)[0].data;
    
    while (i < worksheet.length) {
      const cellValue = worksheet[i][columnNumber];

      if (!cellValue) {
        i++;
        continue;
      };

      let newRules = cellValue.split(',').map((rule) => {
        return new BlockRule(rule.trim());
      });

      rules = rules.concat(newRules);
      i++;
    }

    fs.writeFile(outputRulesFileName, fileHeader, { flag: 'a+' }, err => {});
    fs.writeFile(outputRulesFileName, rules.join('\n'), { flag: 'a+' }, err => {});
  });
});