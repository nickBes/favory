<script setup lang="ts">
import { ref, onMounted, Ref } from "vue"
import ForceGraph3D from "3d-force-graph"

const div: Ref<HTMLDivElement | undefined> = ref()
const graph = ForceGraph3D()

onMounted(() => {
    if (div.value) {
        graph(div.value)
            .jsonUrl("/data.json")
            .linkDirectionalArrowLength(4)
            .linkDirectionalArrowRelPos(1)
            .linkLabel("weight")
            .nodeLabel("id")
    }
})

</script>

<template>
    <div ref="div"></div>
</template>

<style scoped>
    body {
        margin: 0px;
    }
</style>