"use client";
import React, { useEffect, useState } from "react";
import Artplayer from "./ArtPlayer";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { CgClose } from "react-icons/cg";
import { playEpisode, playMovie } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import { consumetPlay } from "@/lib/consumetApi";
import { toast } from "react-toastify";
import ErrorMessage from "../ErrorMessage";


interface PosterData {
  posterPath?: string;
  backdropPath?: string;
}

const Stream = ({
  params,
}: {
  params: { imdb: string; type: string; id: string; seasonEpisode?: string; };
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  //const season = searchParams.get("season");
  //const episode = searchParams.get("episode");
  const dispatch = useAppDispatch();
  const [url, setUrl] = useState<string>("");
  const [posterData, setPosterData] = useState<PosterData>({});
  const [error, setError] = useState(false);
  const ref = React.useRef<any>();
  const [art, setArt] = useState<any>();
  const [availableLang, setAvailableLang] = useState<any>([""]);
  const [currentLang, setCurrentLang] = useState<any>("");
  const [sub, setSub] = useState<any>([]);

  let season: string | null = null;
  let episode: string | null = null;

  if (params.seasonEpisode) {
    [season, episode] = params.seasonEpisode.split('-');
  } else {
    season = searchParams.get("season");
    episode = searchParams.get("episode");
  }

  const provider = useAppSelector((state) => state.options.api);

  useEffect(() => {
    async function fetchPosterData() {
      try {
        // First try to get TMDB ID using IMDB ID
        const findResponse = await fetch(
          `https://api.themoviedb.org/3/find/${params.imdb}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&external_source=imdb_id`
        );
        console.log(findResponse)
        const findData = await findResponse.json();
        
        // Get the TMDB ID from the results
        const tmdbId = findData?.movie_results?.[0]?.id || findData?.tv_results?.[0]?.id;
        console.log(tmdbId)
        
        if (tmdbId) {
          // Fetch detailed data using TMDB ID
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/${params.type}/${tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`
          );
          console.log(detailsResponse)
          const detailsData = await detailsResponse.json();
          console.log(detailsData)
          
          setPosterData({
            posterPath: detailsData.poster_path,
            backdropPath: detailsData.backdrop_path
          });
          console.log(detailsData.poster_path)
          console.log(detailsData.backdrop_path)
        }
      } catch (error) {
        console.error('Error fetching poster data:', error);
      }
    }

    fetchPosterData();
  }, [params.imdb, params.type]);

  useEffect(() => {
    async function get8Stream() {
      if (params.type === "movie") {
        const data = await playMovie(params.imdb, currentLang);
        // console.log(data);
        if (data?.success && data?.data?.link?.length > 0) {
          art?.switchUrl(data?.data?.link);
          setUrl(data?.data?.link);
          setAvailableLang(data?.availableLang);
        } else {
          setError(true);
        }
      } else {
        const data = await playEpisode(
          params.imdb,
          parseInt(season as string),
          parseInt(episode as string),
          currentLang
        );
        // console.log(data);
        if (data?.success && data?.data?.link?.length > 0) {
          setUrl(data?.data?.link);
          setAvailableLang(data?.availableLang);
          art?.switchUrl(data?.data?.link);
        } else {
          setError(true);
        }
      }
    }
    async function getConsumet() {
      const data = await consumetPlay(
        params.id,
        params.type,
        parseInt(episode as string),
        parseInt(season as string)
      );
      console.log(data);
      if (data?.success && data?.data?.sources?.length > 0) {
        setUrl(data?.data?.sources[data?.data?.sources.length - 1]?.url);
        setSub(data?.data?.subtitles);
      } else {
        setError(true);
      }
    }
    if (provider === "8stream") {
      get8Stream();
    } else {
      getConsumet();
    }
  }, [currentLang]);
  const getPosterUrl = () => {
    if (posterData.backdropPath) {
      return `https://image.tmdb.org/t/p/original${posterData.backdropPath}`;
    }
    if (posterData.posterPath) {
      return `https://image.tmdb.org/t/p/original${posterData.posterPath}`;
    }
    return ''; // Fallback empty string if no poster available
  };
  return (
    <div className="fixed bg-black inset-0 flex justify-center items-end z-[200]">
      <div className="w-[100%] h-[100%] rounded-lg" id="player-container">
        {url?.length > 0 ? (
          <Artplayer
            artRef={ref}
            sub={sub}
            posterUrl={getPosterUrl()} // Pass poster URL directly to ArtPlayer
            availableLang={availableLang} // Add this prop
            onLanguageChange={(lang: string) => {
              setCurrentLang(lang);  // This will trigger the useEffect to fetch new URL
              console.log("Language changed to:", lang); // For debugging
            }}
            style={{ width: "100%", height: "100%", aspectRatio: "16/9" }}
            option={{
              container: "#player-container",
              url: url,
              aspectRatio: true,
              flip: true,
              miniProgressBar: true,
              setting: true,
              theme: "#fcba03",
              
              controls: [
                {
                  name: "Lang",
                  position: "right",
                  index: 10,
                  html: ``,
                  style: {
                    display: "none"
                  },
                  selector: [
                    ...availableLang.map((item: any, i: number) => {
                      return {
                        default: i === 0,
                        html: ``,
                        value: item,
                      };
                    }),
                  ],
                  onSelect: function (item, $dom) {
                    // @ts-ignore
                    setCurrentLang(item.value); 
                    return item.html; 
                  },
                }, 
              ],
              playbackRate: true,
              fullscreen: true,
              subtitleOffset: false,
              subtitle: {
                type: "vtt",
                escape: false,
                style: {
                  color: "#fff",
                  // @ts-ignore
                  "font-size": "35px",
                  "font-family": "sans-serif",
                  "text-shadow":
                    "-3px 3px 4px rgba(0, 0, 0, 1),2px 2px 4px rgba(0, 0, 0, 1),1px -1px 3px rgba(0, 0, 0, 1),-3px -2px 4px rgba(0, 0, 0, 1)",
                },
              },
              lock: true,
              fastForward: true,
              cssVar: {
                "--art-indicator-scale": 1.5,
                "--art-indicator-size": "15px",
                "--art-bottom-gap": "0px",
                "--art-control-icon-scale": 1.7,
                //"--art-padding": "10px 30px 0px",
                // "--art-control-icon-size": "60px",
                "--art-volume-handle-size": "20px",
                "--art-volume-height": "150px",
              },
            }}
            getInstance={(art: any) => {
              setArt(art);
            }}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            <span className="loader"></span>
          </div>
        )}
      </div>
      {/*<div
        className="absolute top-0 right-0 m-5 cursor-pointer z-50"
        onClick={() => {
          router.replace(`/watch/${params.type}/${params.id}}`);
        }}
      >
        <CgClose className="text-white text-4xl" />
      </div>*/} 
    </div>
  );
};

export default Stream;
