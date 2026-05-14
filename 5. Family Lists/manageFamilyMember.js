$(document).ready(function () {
  const queryString = window.location.href;
  var url = new URL(queryString);
  var token = new URLSearchParams(url.search).get('token'); 
  var personId = new URLSearchParams(url.search).get('personId'); 
    
    //apply token to Quote field
    setTimeout(function() { 
        if (token) {
            $('.sessionToken input').val(token);
            $('.sessionToken input').change();
            $('.userId input').val(personId);
            $('.userId input').change();
        } else {
            return; // No token found, skip the rest of the setup
        }
    }, 1000);
});
