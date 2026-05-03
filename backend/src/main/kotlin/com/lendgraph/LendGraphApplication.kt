package com.lendgraph

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class LendGraphApplication

fun main(args: Array<String>) {
    runApplication<LendGraphApplication>(*args)
}
