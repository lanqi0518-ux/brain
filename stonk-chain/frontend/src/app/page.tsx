import Hero from '@/components/Hero';
import Architecture from '@/components/Architecture';
import CodeDiff from '@/components/CodeDiff';
import Modules from '@/components/Modules';
import Ecosystem from '@/components/Ecosystem';
import Roadmap from '@/components/Roadmap';
import FinalCTA from '@/components/FinalCTA';

export default function Home() {
    return (
        <>
            <Hero />
            <Architecture />
            <CodeDiff />
            <Modules />
            <Ecosystem />
            <Roadmap />
            <FinalCTA />
        </>
    );
}
