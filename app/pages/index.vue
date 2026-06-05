<script lang="ts" setup>
const { data: events } = await useAsyncData('events', () =>
  queryCollection('events').order('stem', 'DESC').all(),
)
</script>

<template>
  <div
    class="lg:p-8 p-4 text-[calc(1em+1.25vw)] font-bold w-full flex items-center flex-col gap-16"
  >
    <div class="flex flex-col gap-8 items-center pt-12">
      <div>
        <h1 class="tracking-[0.15em] text-center">[ untitled games event ]</h1>
        <div class="text-sm text-right mt-2">(yoo-gee)</div>
      </div>
      <div class="max-w-[15em] text-center leading-tight tracking-wide">
        a space for experimental games and playable arts
        <!-- <div class="text-sm mt-2">
          an afternoon of talks, plays &amp; things to poke at
        </div> -->
      </div>

      <div class="flex gap-24 leading-tight flex-wrap pt-8">
        <div class="max-w-[15em]">
          a "monthly" sunday event<br />16:30 – 19:00
        </div>
        <div class="max-w-[15em] leading-tight tracking-wide text-right">
          <a
            class="md:hover:text-black"
            href="https://maps.google.com/?q=Tussen+de+Bogen+46,+1013+JB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tussen de Bogen 46<br />1013 JB
          </a>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 items-center">
      <div class="text-center">
        <div>Sign up to stay informed on events?</div>
        <input
          type="email"
          placeholder="you@email.com"
          class="mt-2 px-4 py-2 rounded border-[0.2em] font-sans border-current focus:outline-none focus:ring-[0.2em] focus:ring-current"
        />
      </div>
      <div class="mt-8">or follow us?</div>
      <div class="flex items-center gap-4">
        <a href="#" class="md:hover:text-black">
          <Icon name="pixel:instagram" size="1.5em" />
        </a>
        <a href="#" class="md:hover:text-black">
          <Icon name="pixel:bluesky" size="1.5em" />
        </a>
        <a href="#" class="md:hover:text-black">
          <Icon name="pixel:linkedin" size="1.5em" />
        </a>
      </div>
    </div>

    <div class="flex gap-32 flex-col items-center w-full">
      <AppEventSummary v-for="event in events" :key="event.id" :event="event" />
    </div>
  </div>
</template>
