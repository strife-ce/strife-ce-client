rm ./dist -r
npm run build:prod
rm -R ../strife-ce-master/dist/app/public/client
cp ./dist ../strife-ce-master/dist/app/public/client -r
