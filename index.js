const http = require('https');
const fs = require('fs');
const xlsx = require('node-xlsx');

const currentDate = new Date();
const fileHeader =
'! Title: Suspicious sites and web pages companies of Russia\n' +
'! Description: Filters of suspicious companies recognized by the Bank of Russia.\n' +
'! Expires: 1 day\n' +
'! Homepage: https://github.com/PrographerMan/cbr-ublock-rules\n' +
'! Last modified: ' + currentDate.toLocaleDateString('en-US').toString() + '\n\n';
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const currentDay = currentDate.getDate();
const dateAsParameter = `${currentMonth}/${currentDay}/${currentYear}`;
const outputXSLXFileName = 'file.xlsx';
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
const file = fs.createWriteStream(outputXSLXFileName);

class BlockRule {
  static addressBeginning = '||';
  static separator = '^';
  static defaultProtocol = 'https://';
  static pageBlockModifier = '$document';

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
      this.blockPage = true;
    }
    
    this.verbatim = address.hostname;
    this.searchParams = new URLSearchParams();
    Object.assign(this.searchParams, address.searchParams)
  }

  toString() {
    const separator = this.hasSeparator ? BlockRule.separator : '';
    const pathname = this.pathname ? this.pathname : '';
    const hasParams = this.searchParams?.toString().length > 0;
    const searchParams = hasParams ? `?${this.searchParams.toString()}` : '';
    const blockPage = this.blockPage ? BlockRule.pageBlockModifier : '';

    return `${BlockRule.addressBeginning}${this.verbatim}${pathname}${searchParams}${separator}${blockPage}`;
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

      let newRules = cellValue.split(',').map((url) => {
        return new BlockRule(url.trim());
      });

      rules = rules.concat(newRules);
      i++;
    }

    fs.writeFile(outputRulesFileName, fileHeader, { flag: 'a+' }, err => {});
    fs.writeFile(outputRulesFileName, rules.join('\n'), { flag: 'a+' }, err => {});
  });
});