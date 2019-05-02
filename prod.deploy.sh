rm ./dist -r
npm run build:prod
cp ./dist ../strife-ce-master/dist/app/public/client -r
