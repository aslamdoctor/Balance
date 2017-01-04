### How to use 
I've gotten a couple of emails about this project and I really never put a thought to anyone other than me using it. I will do my best to explain what is required to set this up locally (aka 'localhost'). 

#### Set up a a new project in the Google Console
* Sign into https://console.cloud.google.com and create a new project.
* Go to the API manager and enable the Calendar API, complete the set up.
* You will be given some credentials with the option to download a json file called something like `client_secretXXXXXX.json`. 
* Download it and place it in the root of this project, renaming it. `client_secret.json`. You dont really want to deploy this this as it contains all your secret googley keys and because it's loaded over XHR anyone will be able to steal it. 
* Once you have that in place, I usually run `python -m SimpleHTTPServer` and use when I need it.


Any more than that, I recommend you read the source code. It's not terribly complicated!


