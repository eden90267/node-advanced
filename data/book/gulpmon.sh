#!/bin/bash
while true
do
    procnum=$(ps -ef|grep -w "gulp"|grep -v grep|wc -l)
    if [ $procnum -eq 0 ];then
        gulp watch > gulp.dat &
    fi
    sleep 1
done