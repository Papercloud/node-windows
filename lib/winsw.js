module.exports = {

  /**
   * @method generateXml
   * Generate the XML for the winsw configuration file.
   * @param {Object} config
   * The config object must have the following attributes:
   *
   * - *id* This is is how the service is identified. Alphanumeric, no spaces.
   * - *name* The descriptive name of the service.
   * - *script* The absolute path of the node.js script. i.e. `C:\path\to\myService.js`
   *
   * Optional attributes include
   *
   * - *description* The description that shows up in the service manager.
   * - *flags* Any flags that should be passed to node. Defaults to `--harmony` to add ES6 support.
   * - *logmode* Valid values include `rotate` (default), `reset` (clear log), `roll` (move to .old), and `append`.
   * - *logpath* The absolute path to the directory where logs should be stored. Defaults to the current directory.
   * - *dependencies* A comma delimited list or array of process dependencies.
   * - *env* A key/value object or array of key/value objects containing
   * environment variables to pass to the process. The object might look like `{name:'HOME',value:'c:\Windows'}`.
   * - *logOnAs* A key/value object that contains the service logon credentials.
   * The object might look like `{account:'user', password:'pwd', domain:'MYDOMAIN'}
   * If this is not included or does not have all 3 members set then it is not used.
   * - *workingdirectory* optional working directory that service should run in.
   * If this is not included, the current working directory of the install process
   * is used.
   */
  generateXml: function(config)
  {
    var xml;

    // helper function - if input is an array return it directly
    // if it's a string, split it and return the resultant array
    function arrSplit(i, splitter)
    {
      if (!(i instanceof Array))
      {
        i = i.split(splitter||',');
      }
      return i;
    }

    // Make sure required configuration items are present
    if (!config || !config.id || !config.name || !config.script)
    {
      throw "WINSW must be configured with a minimum of id, name and script";
    }

    // create json template of xml
    // only the portion of the xml inside the top level 'service' tag
    xml = [
      {id: config.id},
      {name: config.name},
      {description: config.description||''},
      {executable: process.execPath},
      {logmode: config.logmode||'rotate'}
    ];

    arrSplit((config.flags || '--harmony'),' ').forEach(function(arg) {
      xml.push({argument:arg});
    });

    xml.push({argument:config.script.trim()});

    // Optionally add log path
    if (config.logpath) {
      xml.push({logpath : config.logpath});
    }

    // Optionally add service dependencies
    if (config.dependencies) {
      arrSplit(config.dependencies).forEach(function(dep){
        xml.push({depend:dep.trim()});
      });
    }

    // Optionally add environment values
    if (config.env) {
      config.env = (config.env instanceof Array == true) ?
        config.env : [config.env];

      config.env.forEach(function(env){
        xml.push({env: {_attr: {name:env.name, value:env.value}}});
      });
    }

    // optionally set the service logon credentials
    if (config.logOnAs && config.logOnAs.account && config.logOnAs.password &&
      config.logOnAs.domain)
    {
      xml.push({
        serviceaccount: [
          {domain: config.logOnAs.domain},
          {user: config.logOnAs.account},
          {password: config.logOnAs.password}
        ]
      });
    }

    // if no working directory specified, use current working directory
    // that this process was launched with
    xml.push({workingdirectory: config.workingdirectory || process.cwd()});

    return require('xml')({service:xml}, true);
  },

  /**
   * @method createExe
   * Create the executable
   * @param {String} name
   * The alphanumeric string (spaces are stripped) of the `.exe` file. For example, `My App` generates `myapp.exe`
   * @param {String} [dir=cwd]
   * The output directory where the executable will be saved.
   * @param {Function} [callback]
   * The callback to fire upon completion.
   */
  createExe: function(name,dir,callback){
    var fs = require('fs'), p = require('path');

    if (typeof dir === 'function'){
      callback = dir;
      dir = null;
    }

    dir = dir || process.cwd();

    var origin = p.join(__dirname,'..','bin','winsw','x'+(require('os').arch().indexOf('64')>0 ? '64':'86'),'winsw.exe'),
        dest = p.join(dir,name.replace(/[^\w]/gi,'').toLowerCase()+'.exe'),
        data = fs.readFileSync(origin,{encoding:'binary'});

    fs.writeFileSync(dest,data,{encoding:'binary'});
    callback && callback();
    //require('child_process').exec('Icacls "'+dest+'" /grant Everyone:(F)',callback)
    //require('child_process').exec('copy "'+origin+'" /y /v /b "'+dest+'" /b',callback);
  }

}
