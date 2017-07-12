var utility = require('./utility');
var classMapping = require('./mapping')['classes'];
var mu = require('mu2');
mu.root = __dirname + '/templates';

let semesterAccount = 'nus-cs2103-AY1617S2';

module.exports = (accuser, repoName) => {
  mu.compile('format-check-request.mst');

  let warnInvalidTitle = (repository, issue) => {
    if (hasFormatCheckRequestedLabel(issue)) {
      return;
    }
    let FormatCheckLabel = "FormatCheckRequested";

    console.log("Adding warning for format fail to PR #" + issue.number);
    accuser.addLabels(repo, issue, [FormatCheckLabel]);
    let student = {
      username: issue.user.login
    };
    var comment = mu.render('format-check-request.mst', student);
    accuser.comment(repository, issue, comment);
  };

  var hasFormatCheckRequestedLabel = (issue) => {
    var result = false;
    issue.labels.forEach(function(label){
      if (label.name.toLowerCase() == FormatCheckLabel.toLowerCase()) {
        result = true;
      }
    });
    return result;
  };

  let assignTutor = (repository, issue, tutor) => {
    if (!tutor) {
      console.log('no tutor found for PR #' + issue.number);
      return;
    }

    console.log("Assigning tutors to PR #" + issue.number);
    accuser.accuse(repository, issue, tutor);
  };

  let repo = accuser.addRepository(semesterAccount, repoName);

  repo.newWorker()
    .filter((repository, issue) => {
      // ensure that we only work with PRs that do not have an assignee
      return issue.pull_request;
    })
    .do((repository, issue) => {
      console.log("Looking at PR #" + issue.number);
      var result = utility._titleRegex.exec(issue.title);

      if (result === null) {
        console.log('Cannot parse title of PR #' + issue.number);
        // we ignore the PR if we cannot parse the title into our issuee-defined regex
        warnInvalidTitle(repository, issue);
        return;
      }

      var activityId = result[1];
      var classId = result[2];
      var teamId = result[4];

      if (!classMapping[classId] || !teamId) {
        // the class ID fetched is invalid.
        console.log('wrong class or team ID for PR #' + issue.number);
        warnInvalidTitle(repository, issue);
        return;
      }

      var tutor = classMapping[classId][teamId];
      assignTutor(repository, issue, tutor);

      if (hasFormatCheckRequestedLabel(issue)) {
        console.log("Removing format check label from PR #" + issue.number);
        accuser.removeLabel(repository, issue, FormatCheckLabel);
      }
    });
};
