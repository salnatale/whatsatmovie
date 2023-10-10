import React from 'react';

function AboutPage() {
    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>About "What's That Movie?"</h1>
            <h2 style={styles.subheading}>Discovering the Cinematic World, One Description at a Time</h2>
            <p style={styles.paragraph}>
                At "What's That Movie?", we believe that every film, from the most obscure indie flick to the most celebrated blockbuster, has a story to tell and an audience to captivate. But we also understand that sometimes, the title of that perfect movie eludes us. That's where we come in.
            </p>

            <h2 style={styles.subheading}>The Journey</h2>
            <p style={styles.paragraph}>
                Born out of a late-night conversation among friends who couldn't quite put a name to a movie, and who all suffer from just the right amount of adhd,  "What's That Movie?" started as a fun project, but has evolved into much more.
            </p>

            <h2 style={styles.subheading}> Vision</h2>
            <p style={styles.paragraph}>
                To bridge the gap between memory and movie titles. We aspire to make "What's That Movie?" the ultimate tool for movie discovery, ensuring that no film remains unnamed. And to explore the unintended effects of our engine, like using your vibes to find a great movie to watch on a sunday night.
            </p>

            <h2 style={styles.subheading}>How Does it Work?</h2>
            <p style={styles.paragraph}>
                Using a blend of technology and an extensive movie database, our platform deciphers your descriptions and matches them with the most fitting titles.
            </p>

            <h2 style={styles.subheading}>Join the Party!</h2>
            <p style={styles.paragraph}>
                Explore, Use, and Share our platform with fellow movie enthusiasts! Whether you're trying to remember an old classic or discover a new favorite, "What's That Movie?" is here to assist.
            </p>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
    },
    heading: {
        borderBottom: '2px solid #333D40',
        paddingBottom: '10px',
        marginBottom: '20px',
        color: '#333D40'
    },
    subheading: {
        marginTop: '20px',
        marginBottom: '10px',
        fontWeight: '600',
        fontSize: '1.5em',
        color: '#666',
    },
    paragraph: {
        marginBottom: '20px',
        fontSize: '1em',
        textAlign: 'justify',
        textIndent: '20px'
    }
}

export default AboutPage;
